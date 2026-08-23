"use server"

import pool from "@/lib/db"
import type { RowDataPacket } from "mysql2"
import { requireAdmin } from "@/lib/authz"
import { jakartaDateToUtcSql, utcSqlToIso } from "@/lib/datetime"
import type { ActivityAction, ActivityEntityType } from "@/lib/activityLog"

export type ActivityLogRow = {
  id: string
  user_id: string | null
  user_name: string | null
  user_role: "kasir" | "admin" | null
  action: ActivityAction
  entity_type: ActivityEntityType | string
  entity_id: string | null
  description: string
  old_value: unknown
  new_value: unknown
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type ActivityLogFilters = {
  page?: number
  dateFrom?: string // YYYY-MM-DD (Jakarta)
  dateTo?: string // YYYY-MM-DD (Jakarta)
  action?: ActivityAction | "all"
  entityType?: string // "all" atau salah satu entity_type
  userId?: string // "all" atau user id
  search?: string // cari di description / entity_id
}

export type ActivityLogResult = {
  data: ActivityLogRow[]
  total: number
  page: number
  pageSize: number
  error?: string
}

const ACTIVITY_LOG_PAGE_SIZE = 50

function parseJsonSafe(value: unknown): unknown {
  if (value == null) return null
  if (typeof value !== "string") return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export async function fetchActivityLogs(filters: ActivityLogFilters): Promise<ActivityLogResult> {
  const { error: authError } = await requireAdmin()
  if (authError) {
    return { data: [], total: 0, page: 1, pageSize: ACTIVITY_LOG_PAGE_SIZE, error: authError }
  }

  const page = Math.max(1, filters.page ?? 1)
  const pageSize = ACTIVITY_LOG_PAGE_SIZE
  const offset = (page - 1) * pageSize

  const where: string[] = []
  const params: unknown[] = []

  if (filters.dateFrom) {
    where.push("created_at >= ?")
    params.push(jakartaDateToUtcSql(filters.dateFrom))
  }
  if (filters.dateTo) {
    where.push("created_at <= ?")
    params.push(jakartaDateToUtcSql(filters.dateTo, true))
  }
  if (filters.action && filters.action !== "all") {
    where.push("action = ?")
    params.push(filters.action)
  }
  if (filters.entityType && filters.entityType !== "all") {
    where.push("entity_type = ?")
    params.push(filters.entityType)
  }
  if (filters.userId && filters.userId !== "all") {
    where.push("user_id = ?")
    params.push(filters.userId)
  }
  if (filters.search && filters.search.trim()) {
    where.push("(description LIKE ? OR entity_id LIKE ? OR user_name LIKE ?)")
    const like = `%${filters.search.trim()}%`
    params.push(like, like, like)
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id, user_name, user_role, action, entity_type, entity_id, description, old_value, new_value, ip_address, user_agent, created_at
       FROM activity_logs
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM activity_logs ${whereSql}`,
      params
    )

    const data: ActivityLogRow[] = rows.map((r) => ({
      id: String(r.id),
      user_id: r.user_id ? String(r.user_id) : null,
      user_name: r.user_name ?? null,
      user_role: r.user_role ?? null,
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id ? String(r.entity_id) : null,
      description: r.description,
      old_value: parseJsonSafe(r.old_value),
      new_value: parseJsonSafe(r.new_value),
      ip_address: r.ip_address ?? null,
      user_agent: r.user_agent ?? null,
      created_at: utcSqlToIso(r.created_at),
    }))

    return { data, total: Number(countRows[0]?.total ?? 0), page, pageSize }
  } catch (error) {
    console.error("Fetch activity logs error:", error)
    return { data: [], total: 0, page, pageSize, error: "Gagal memuat log aktivitas" }
  }
}

export async function fetchActivityLogUserOptions(): Promise<{ id: string; label: string }[]> {
  const { error: authError } = await requireAdmin()
  if (authError) return []

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, username, nama_lengkap FROM users ORDER BY username ASC"
    )
    return rows.map((r) => ({
      id: String(r.id),
      label: r.nama_lengkap ? `${r.nama_lengkap} (${r.username})` : String(r.username),
    }))
  } catch (error) {
    console.error("Fetch activity log user options error:", error)
    return []
  }
}
