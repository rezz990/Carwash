import pool from "@/lib/db"
import type { RowDataPacket } from "mysql2"
import { getCurrentUser } from "@/lib/authz"
import { utcSqlToIso } from "@/lib/datetime"
import { UserTable, type UserProfile } from "./UserTable"

export default async function UsersPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "admin") return null

  let users: UserProfile[] = []
  let loadError: string | undefined
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, username, nama_lengkap, role, aktif, created_at
      FROM users ORDER BY aktif DESC, created_at DESC
    `)
    users = rows.map((row) => ({
      id: String(row.id), username: String(row.username), nama_lengkap: row.nama_lengkap ? String(row.nama_lengkap) : null,
      role: row.role === "admin" ? "admin" : "kasir", aktif: Boolean(row.aktif), created_at: utcSqlToIso(row.created_at),
    }))
  } catch (error) {
    console.error("Fetch users error:", error)
    loadError = "Daftar user gagal dimuat. Coba muat ulang halaman."
  }

  return <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
    <header><p className="text-sm font-medium text-slate-500">Akses tim</p><h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Kelola user</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Tambah kasir atau admin, atur akses, reset password, dan nonaktifkan akun tanpa menghapus histori transaksi.</p></header>
    <UserTable data={users} currentUserId={currentUser.id} loadError={loadError} />
  </div>
}
