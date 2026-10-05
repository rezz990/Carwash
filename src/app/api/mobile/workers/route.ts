import type { RowDataPacket } from "mysql2"
import pool from "@/lib/db"
import { jsonError, jsonOk, requireMobileAuth } from "@/lib/mobile/http"
export async function GET(request: Request) { try { const auth = await requireMobileAuth(request, ["kasir"]); if ("error" in auth) return auth.error; const [rows] = await pool.query<RowDataPacket[]>("SELECT id, nama FROM petugas_cuci WHERE aktif = 1 ORDER BY nama ASC"); return jsonOk({ data: rows.map(r => ({ id: String(r.id), nama: String(r.nama) })) }) } catch (error) { console.error(error); return jsonError(500, "INTERNAL_ERROR", "Gagal memuat petugas") } }
