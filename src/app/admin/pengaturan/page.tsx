import pool from "@/lib/db"
import type { RowDataPacket } from "mysql2"
import { getCurrentUser } from "@/lib/authz"
import { getLoginTimeoutMinutes } from "@/lib/loginTimeout"
import { PengaturanTabs } from "./PengaturanTabs"

export default async function PengaturanPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "admin") return null
  const loginTimeoutMinutes = await getLoginTimeoutMinutes()
  let name = currentUser.nama_lengkap ?? ""
  let username = currentUser.username
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT nama_lengkap, username FROM users WHERE id = ? LIMIT 1", [currentUser.id])
    if (rows[0]) { name = rows[0].nama_lengkap ? String(rows[0].nama_lengkap) : ""; username = String(rows[0].username) }
  } catch (error) { console.error("Fetch profile error:", error) }

  return <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
    <header><p className="text-sm font-medium text-slate-500">Akun dan sistem</p><h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Pengaturan</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Kelola profil, keamanan sesi, notifikasi perangkat, dan salinan transaksi.</p></header>
    <PengaturanTabs currentNama={name} currentUsername={username} loginTimeoutMinutes={loginTimeoutMinutes} />
  </div>
}
