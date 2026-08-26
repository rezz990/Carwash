import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import type { ResultSetHeader } from "mysql2";
import {
  verifyMobileAccessToken
} from "@/lib/mobile/jwt";
import { getLoginTimeoutMinutes } from "@/lib/loginTimeout";

export function jsonError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ success: false, error: { code, message, ...(details === undefined ? {} : { details }) } }, { status });
}

export function jsonOk<T extends object>(data: T, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export async function requireMobileAuth(request: Request, allowedRoles: Array<"kasir" | "admin"> = ["kasir"]) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return { error: jsonError(401, "UNAUTHORIZED", "Token akses diperlukan") } as const;

  const token = verifyMobileAccessToken(match[1]);
  if (!token || !allowedRoles.includes(token.role)) {
    return { error: jsonError(401, "INVALID_TOKEN", "Token tidak valid atau sudah kedaluwarsa") } as const;
  }

  const timeoutMinutes = await getLoginTimeoutMinutes();
  const [sessionResult] = await pool.query<ResultSetHeader>(
    `UPDATE mobile_sessions
     SET last_activity_at = GREATEST(UTC_TIMESTAMP(6), DATE_ADD(last_activity_at, INTERVAL 1 MICROSECOND))
     WHERE id = ? AND user_id = ? AND revoked_at IS NULL
       AND expires_at > UTC_TIMESTAMP()
       AND last_activity_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)`,
    [token.sid, token.sub, timeoutMinutes]
  );
  if (sessionResult.affectedRows === 0) {
    return { error: jsonError(401, "SESSION_TIMEOUT", "Sesi berakhir karena tidak ada aktivitas") } as const;
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, username, nama_lengkap, role, aktif FROM users WHERE id = ? LIMIT 1",
    [token.sub]
  );
  const user = rows[0];
  if (!user || !user.aktif) return { error: jsonError(403, "ACCOUNT_DISABLED", "Akun tidak aktif") } as const;
  if (user.role !== token.role) return { error: jsonError(401, "SESSION_STALE", "Sesi tidak lagi sesuai dengan role akun") } as const;

  return { user: { id: user.id as string, username: user.username as string, nama_lengkap: user.nama_lengkap as string | null, role: user.role as "kasir" | "admin", aktif: Boolean(user.aktif) }, token } as const;
}

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function normalizePlate(value: unknown) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
}

export function isValidPlate(plate: string) {
  return /^[A-Z]{1,2}[0-9]{1,4}[A-Z]{0,3}$/.test(plate);
}
