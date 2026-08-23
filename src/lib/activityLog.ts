import { headers } from "next/headers"
import pool from "@/lib/db"

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
        (id, user_id, user_name, user_role, action, entity_type, entity_id, description, old_value, new_value, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ]
    )
  } catch (error) {
    // Sengaja hanya di-log ke console, tidak di-throw ulang.
    console.error("logActivity gagal mencatat activity log:", error)
  }
}
