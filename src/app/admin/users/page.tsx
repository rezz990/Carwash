import { getCurrentUser } from "@/lib/authz"
import pool from "@/lib/db"
import type { RowDataPacket } from "mysql2"
import { UserTable } from "./UserTable"
import { utcSqlToIso } from "@/lib/datetime"

export default async function UsersPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "admin") return null

  let users: any[] = []
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, username, nama_lengkap, role, aktif, created_at
      FROM users
      ORDER BY created_at DESC
    `)
    users = rows.map((row) => ({
      id: row.id,
      username: row.username,
      nama_lengkap: row.nama_lengkap,
      role: row.role,
      aktif: Boolean(row.aktif),
      created_at: utcSqlToIso(row.created_at),
    }))
  } catch (error) {
    console.error("Fetch users error:", error)
  }

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out min-w-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Kelola User</h1>
        <p className="text-slate-500 mt-1.5 sm:mt-2 text-sm sm:text-base">
          Tambah, ubah role, reset password, atau nonaktifkan akun kasir/admin.
        </p>
      </div>

      <UserTable data={users} currentUserId={currentUser.id} />
    </div>
  )
}