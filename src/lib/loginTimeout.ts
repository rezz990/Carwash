import type { RowDataPacket } from "mysql2"
import pool from "@/lib/db"
import type { ResultSetHeader } from "mysql2"

export const DEFAULT_LOGIN_TIMEOUT_MINUTES = 60
export const MIN_LOGIN_TIMEOUT_MINUTES = 5
export const MAX_LOGIN_TIMEOUT_MINUTES = 7 * 24 * 60

const CACHE_TTL_MS = 30_000
const globalTimeoutCache = globalThis as typeof globalThis & {
  loginTimeoutCache?: { value: number; expiresAt: number }
}

function isValidTimeout(value: number) {
  return Number.isInteger(value) && value >= MIN_LOGIN_TIMEOUT_MINUTES && value <= MAX_LOGIN_TIMEOUT_MINUTES
}

export async function getLoginTimeoutMinutes() {
  const cached = globalTimeoutCache.loginTimeoutCache
  if (cached && cached.expiresAt > Date.now()) return cached.value

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1",
      ["login_timeout_minutes"]
    )
    const value = Number(rows[0]?.setting_value)
    if (isValidTimeout(value)) {
      globalTimeoutCache.loginTimeoutCache = { value, expiresAt: Date.now() + CACHE_TTL_MS }
      return value
    }
  } catch (error) {
    console.error("Fetch login timeout setting error:", error)
  }
  return DEFAULT_LOGIN_TIMEOUT_MINUTES
}

export async function setLoginTimeoutMinutes(minutes: number) {
  if (!isValidTimeout(minutes)) throw new RangeError("Timeout login tidak valid")
  await pool.query<ResultSetHeader>(
    `INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = UTC_TIMESTAMP()`,
    ["login_timeout_minutes", String(minutes)]
  )
  globalTimeoutCache.loginTimeoutCache = { value: minutes, expiresAt: Date.now() + CACHE_TTL_MS }
}
