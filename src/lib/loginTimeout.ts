import type { RowDataPacket } from "mysql2"
import pool from "@/lib/db"

export const DEFAULT_LOGIN_TIMEOUT_MINUTES = 60
export const MIN_LOGIN_TIMEOUT_MINUTES = 5
export const MAX_LOGIN_TIMEOUT_MINUTES = 7 * 24 * 60

export async function getLoginTimeoutMinutes() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1",
      ["login_timeout_minutes"]
    )
    const value = Number(rows[0]?.setting_value)
    if (Number.isInteger(value) && value >= MIN_LOGIN_TIMEOUT_MINUTES && value <= MAX_LOGIN_TIMEOUT_MINUTES) {
      return value
    }
  } catch (error) {
    console.error("Fetch login timeout setting error:", error)
  }
  return DEFAULT_LOGIN_TIMEOUT_MINUTES
}
