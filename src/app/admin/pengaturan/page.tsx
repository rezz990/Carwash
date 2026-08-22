import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import pool from "@/lib/db"
import type { RowDataPacket } from "mysql2"
import { PengaturanTabs } from "./PengaturanTabs"

export default async function PengaturanPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id

  let namaLengkap = ""
  let username = ""

  if (userId) {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT nama_lengkap, username FROM users WHERE id = ?",
        [userId]
      )
      if (rows.length > 0) {
        namaLengkap = rows[0].nama_lengkap
        username = rows[0].username
      }
    } catch (error) {
      console.error("Fetch profile error:", error)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out min-w-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Pengaturan</h1>
        <p className="text-slate-500 mt-1.5 sm:mt-2 text-sm sm:text-base">
          Kelola akun Anda dan pengaturan sistem.
        </p>
      </div>

      <PengaturanTabs currentNama={namaLengkap} currentUsername={username}/>
    </div>
  )
}