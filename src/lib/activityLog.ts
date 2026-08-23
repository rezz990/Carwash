import { headers } from "next/headers"
import pool from "@/lib/db"
import { nowUtcSql } from "@/lib/datetime"
import type { ResultSetHeader } from "mysql2"

const DEFAULT_RETENTION_DAYS = 90
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000
const CLEANUP_BATCH_SIZE = 5_000

const globalForActivityLog = globalThis as unknown as {
  activityLogCleanupLastAttempt?: number
}

function getRetentionDays(): number {
  const configured = Number(process.env.ACTIVITY_LOG_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS)
  if (!Number.isInteger(configured) || configured < 1) return DEFAULT_RETENTION_DAYS
  return Math.min(configured, 3_650)
}

/**
 * Hapus log kedaluwarsa paling banyak sekali per proses dalam 24 jam.
 * Cleanup dijalankan bertahap agar tidak menahan lock terlalu lama ketika log menumpuk.
 */
async function cleanupExpiredActivityLogs(): Promise<void> {
  const now = Date.now()
  if (
    globalForActivityLog.activityLogCleanupLastAttempt &&
    now - globalForActivityLog.activityLogCleanupLastAttempt < CLEANUP_INTERVAL_MS
  ) {
    return
  }

  globalForActivityLog.activityLogCleanupLastAttempt = now
  const cutoff = new Date(now - getRetentionDays() * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ")

  let affectedRows: number
  do {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM activity_logs WHERE created_at < ? LIMIT ?",
      [cutoff, CLEANUP_BATCH_SIZE]
    )
    affectedRows = result.affectedRows
  } while (affectedRows === CLEANUP_BATCH_SIZE)
}

/**
 * Harus sinkron dengan ENUM di migrations/0003_activity_log.sql
 */
export type ActivityAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "EXPORT"
  | "PRINT"

/**
 * Bebas string pendek (VARCHAR(50) di DB), tapi dibatasi union di sini
 * supaya konsisten dipakai di seluruh aplikasi.
 */
export type ActivityEntityType =
  | "transaksi"
  | "tarif"
  | "user"
  | "pengaturan"
  | "laporan"
  | "auth"

export type ActivityActor = {
  id: string | null
  username?: string | null
  role?: "kasir" | "admin" | null
} | null

export type LogActivityParams = {
  actor: ActivityActor
  action: ActivityAction
  entityType: ActivityEntityType
  entityId?: string | null
  description: string
  oldValue?: unknown
  newValue?: unknown
  /** Override manual. Kalau tidak diisi, otomatis diambil dari next/headers() jika memungkinkan (server action / route handler). */
  ip?: string | null
  /** Override manual, sama seperti `ip`. */
  userAgent?: string | null
}

async function resolveRequestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers()
    const forwarded = h.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || null
    const userAgent = h.get("user-agent")
    return { ip, userAgent }
  } catch {
    // headers() cuma bisa dipanggil dalam request scope (server action /
    // route handler / server component). Di luar itu (mis. cron/background
    // job) ini akan throw - aman untuk diabaikan saja.
    return { ip: null, userAgent: null }
  }
}

/**
 * Catat satu baris activity log.
 *
 * PENTING: fungsi ini SENGAJA tidak pernah melempar error ke pemanggilnya.
 * Kegagalan mencatat log (misalnya DB lagi bermasalah) TIDAK BOLEH
 * menggagalkan aksi utama seperti membuat transaksi atau update user.
 * Ini mengikuti pola yang sama seperti `emitNewTransaction` di lib/events.ts.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    let ip = params.ip
    let userAgent = params.userAgent

    if (ip === undefined || userAgent === undefined) {
      const meta = await resolveRequestMeta()
      if (ip === undefined) ip = meta.ip
      if (userAgent === undefined) userAgent = meta.userAgent
    }

    await pool.query(
      `INSERT INTO activity_logs
        (id, user_id, user_name, user_role, action, entity_type, entity_id, description, old_value, new_value, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        params.actor?.id ?? null,
        params.actor?.username ?? null,
        params.actor?.role ?? null,
        params.action,
        params.entityType,
        params.entityId ?? null,
        params.description,
        params.oldValue === undefined ? null : JSON.stringify(params.oldValue),
        params.newValue === undefined ? null : JSON.stringify(params.newValue),
        ip ? ip.slice(0, 45) : null,
        userAgent ? userAgent.slice(0, 255) : null,
        nowUtcSql(),
      ]
    )

  } catch (error) {
    // Sengaja hanya di-log ke console, tidak di-throw ulang.
    console.error("logActivity gagal mencatat activity log:", error)
    return
  }

  try {
    await cleanupExpiredActivityLogs()
  } catch (error) {
    // Cleanup bersifat pemeliharaan dan tidak boleh mengubah hasil aksi utama
    // maupun membuat log yang baru saja berhasil disimpan dianggap gagal.
    console.error("Cleanup activity log kedaluwarsa gagal:", error)
  }
}
