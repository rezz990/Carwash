import { createHash, randomBytes } from "node:crypto"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import pool from "@/lib/db"
import { signMobileAccessToken } from "@/lib/mobile/jwt"

const ACCESS_SECONDS = 15 * 60
const REFRESH_DAYS = 30

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export async function issueMobileSession(user: { id: string; username: string; role: "kasir" | "admin" }) {
  const refreshToken = randomBytes(48).toString("base64url")
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
  await pool.query<ResultSetHeader>("INSERT INTO mobile_sessions (id, user_id, refresh_token_hash, expires_at) VALUES (?, ?, ?, ?)", [randomBytes(16).toString("hex"), user.id, hash(refreshToken), expiresAt])
  return { accessToken: signMobileAccessToken({ sub: user.id, username: user.username, role: user.role }, ACCESS_SECONDS), refreshToken, accessExpiresIn: ACCESS_SECONDS, refreshExpiresAt: expiresAt.toISOString() }
}

export async function rotateMobileSession(refreshToken: string) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT ms.id, ms.user_id, u.username, u.role, u.aktif FROM mobile_sessions ms JOIN users u ON u.id = ms.user_id WHERE ms.refresh_token_hash = ? AND ms.revoked_at IS NULL AND ms.expires_at > UTC_TIMESTAMP() LIMIT 1`, [hash(refreshToken)])
    const session = rows[0]
    if (!session || !session.aktif) { await connection.rollback(); return null }
    const newRefreshToken = randomBytes(48).toString("base64url")
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
    await connection.query("UPDATE mobile_sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = ?", [session.id])
    await connection.query<ResultSetHeader>("INSERT INTO mobile_sessions (id, user_id, refresh_token_hash, expires_at) VALUES (?, ?, ?, ?)", [randomBytes(16).toString("hex"), session.user_id, hash(newRefreshToken), expiresAt])
    await connection.commit()
    const role = String(session.role).toLowerCase() as "kasir" | "admin"
    return { accessToken: signMobileAccessToken({ sub: String(session.user_id), username: String(session.username), role }, ACCESS_SECONDS), refreshToken: newRefreshToken, accessExpiresIn: ACCESS_SECONDS, refreshExpiresAt: expiresAt.toISOString() }
  } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
}

export async function revokeMobileSession(refreshToken: string) {
  await pool.query<ResultSetHeader>("UPDATE mobile_sessions SET revoked_at = UTC_TIMESTAMP() WHERE refresh_token_hash = ? AND revoked_at IS NULL", [hash(refreshToken)])
}
