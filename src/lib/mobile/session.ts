import { createHash, randomBytes } from "node:crypto"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import pool from "@/lib/db"
import { signMobileAccessToken } from "@/lib/mobile/jwt"
import { getLoginTimeoutMinutes } from "@/lib/loginTimeout"

const ACCESS_SECONDS = 15 * 60
const REFRESH_DAYS = 30

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export async function issueMobileSession(user: { id: string; username: string; role: "kasir" | "admin" }) {
  const loginTimeoutMinutes = await getLoginTimeoutMinutes()
  const sessionId = randomBytes(16).toString("hex")
  const refreshToken = randomBytes(48).toString("base64url")
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
  await pool.query<ResultSetHeader>("INSERT INTO mobile_sessions (id, user_id, refresh_token_hash, expires_at, last_activity_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())", [sessionId, user.id, hash(refreshToken), expiresAt])
  return { accessToken: signMobileAccessToken({ sub: user.id, sid: sessionId, username: user.username, role: user.role }, ACCESS_SECONDS), refreshToken, accessExpiresIn: ACCESS_SECONDS, refreshExpiresAt: expiresAt.toISOString(), loginTimeoutMinutes }
}

export async function rotateMobileSession(refreshToken: string) {
  const timeoutMinutes = await getLoginTimeoutMinutes()
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT ms.id, ms.user_id, u.username, u.role, u.aktif FROM mobile_sessions ms JOIN users u ON u.id = ms.user_id WHERE ms.refresh_token_hash = ? AND ms.revoked_at IS NULL AND ms.expires_at > UTC_TIMESTAMP() AND ms.last_activity_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE) LIMIT 1 FOR UPDATE`, [hash(refreshToken), timeoutMinutes])
    const session = rows[0]
    if (!session || !session.aktif) { await connection.rollback(); return null }
    const newRefreshToken = randomBytes(48).toString("base64url")
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
    await connection.query("UPDATE mobile_sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = ?", [session.id])
    const sessionId = randomBytes(16).toString("hex")
    await connection.query<ResultSetHeader>("INSERT INTO mobile_sessions (id, user_id, refresh_token_hash, expires_at, last_activity_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())", [sessionId, session.user_id, hash(newRefreshToken), expiresAt])
    await connection.commit()
    const role = String(session.role).toLowerCase() as "kasir" | "admin"
    return { accessToken: signMobileAccessToken({ sub: String(session.user_id), sid: sessionId, username: String(session.username), role }, ACCESS_SECONDS), refreshToken: newRefreshToken, accessExpiresIn: ACCESS_SECONDS, refreshExpiresAt: expiresAt.toISOString(), loginTimeoutMinutes: timeoutMinutes }
  } catch (error) { await connection.rollback(); throw error } finally { connection.release() }
}

export async function revokeMobileSession(refreshToken: string) {
  const tokenHash = hash(refreshToken)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ms.user_id, u.username, u.role FROM mobile_sessions ms JOIN users u ON u.id = ms.user_id WHERE ms.refresh_token_hash = ? AND ms.revoked_at IS NULL LIMIT 1`,
    [tokenHash]
  )
  const session = rows[0]
  await pool.query<ResultSetHeader>("UPDATE mobile_sessions SET revoked_at = UTC_TIMESTAMP() WHERE refresh_token_hash = ? AND revoked_at IS NULL", [tokenHash])
  if (!session) return null
  return { userId: String(session.user_id), username: String(session.username), role: session.role as "kasir" | "admin" }
}
