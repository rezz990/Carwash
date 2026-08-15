import bcrypt from "bcryptjs"
import type { RowDataPacket } from "mysql2"
import pool from "@/lib/db"
import { jsonError, jsonOk, getClientIp } from "@/lib/mobile/http"
import { issueMobileSession } from "@/lib/mobile/session"

const attempts = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 10

function allowed(ip: string) {
  const now = Date.now(); const current = attempts.get(ip)
  if (!current || current.resetAt <= now) { attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS }); return true }
  if (current.count >= MAX_ATTEMPTS) return false
  current.count += 1; return true
}

export async function POST(request: Request) {
  if (!allowed(getClientIp(request))) return jsonError(429, "TOO_MANY_ATTEMPTS", "Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.")
  try {
    const body = await request.json(); const username = String(body?.username ?? "").trim(); const password = String(body?.password ?? "")
    if (!username || !password) return jsonError(400, "INVALID_INPUT", "Username dan password wajib diisi")
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id, username, password_hash, nama_lengkap, role, aktif FROM users WHERE username = ? LIMIT 1", [username])
    const user = rows[0]
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return jsonError(401, "INVALID_CREDENTIALS", "Username atau password salah")
    if (!user.aktif) return jsonError(403, "ACCOUNT_DISABLED", "Akun dinonaktifkan")
    if (String(user.role).toLowerCase() !== "kasir") return jsonError(403, "ROLE_NOT_ALLOWED", "Akun admin hanya dapat digunakan melalui Web App")
    const session = await issueMobileSession({ id: String(user.id), username: String(user.username), role: "kasir" })
    return jsonOk({ user: { id: String(user.id), username: String(user.username), nama_lengkap: user.nama_lengkap ?? null, role: "kasir", aktif: true }, tokenType: "Bearer", ...session })
  } catch (error) { console.error("Mobile login error:", error); return jsonError(500, "INTERNAL_ERROR", "Terjadi kesalahan pada server") }
}
