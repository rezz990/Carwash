import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import pool from "@/lib/db"
import type { RowDataPacket } from "mysql2"

export type CurrentUser = {
  id: string
  username: string
  nama_lengkap: string | null
  role: "admin" | "kasir"
  aktif: boolean
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) return null

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, username, nama_lengkap, role, aktif FROM users WHERE id = ? LIMIT 1",
    [userId]
  )
  if (rows.length === 0 || !rows[0].aktif) return null

  return {
    id: String(rows[0].id),
    username: String(rows[0].username),
    nama_lengkap: rows[0].nama_lengkap ?? null,
    role: rows[0].role,
    aktif: Boolean(rows[0].aktif),
  }
}

export async function requireLogin() {
  const user = await getCurrentUser()
  if (!user) return { user: null, error: "Anda harus login" as const }
  return { user, error: null }
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { user: null, error: "Anda harus login" as const }
  if (user.role !== "admin") {
    return { user: null, error: "Hanya admin yang bisa mengakses fitur ini" as const }
  }
  return { user, error: null }
}
