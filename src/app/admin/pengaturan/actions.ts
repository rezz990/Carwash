"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { requireAdmin } from "@/lib/authz"
import pool from "@/lib/db"
import bcrypt from "bcryptjs"
import type { RowDataPacket } from "mysql2"
import { utcSqlToIso } from "@/lib/datetime"

// ---------------------------------------------------------
// AKUN SAYA
// ---------------------------------------------------------

export async function updateOwnProfile(namaLengkap: string) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return { error: "Anda harus login" }

  try {
    await pool.query(
      "UPDATE users SET nama_lengkap = ? WHERE id = ?",
      [namaLengkap.trim() || null, userId]
    )
  } catch (error) {
    console.error("Update own profile error:", error)
    return { error: "Gagal menyimpan nama" }
  }

  revalidatePath("/admin/pengaturan")
  return { success: true }
}

export async function updateOwnUsername(username: string) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return { error: "Sesi tidak valid" }

  const clean = username.trim().toLowerCase()
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
    return { error: "Username 3-20 karakter, hanya huruf kecil, angka, dan underscore" }
  }

  // pastikan tidak dipakai user lain
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE username = ? AND id != ?",
    [clean, userId]
  )
  if (existing.length > 0) return { error: "Username sudah dipakai user lain" }

  await pool.query("UPDATE users SET username = ? WHERE id = ?", [clean, userId])
  revalidatePath("/pengaturan") // sesuaikan dengan route halaman ini
  return { success: true }
}

export async function changeOwnPassword(params: {
  currentPassword: string
  newPassword: string
}) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return { error: "Anda harus login" }

  if (params.newPassword.length < 6) {
    return { error: "Password baru minimal 6 karakter" }
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT password_hash FROM users WHERE id = ?",
      [userId]
    )
    if (rows.length === 0) return { error: "User tidak ditemukan" }

    const user = rows[0]
    const isValidPassword = await bcrypt.compare(params.currentPassword, user.password_hash)

    if (!isValidPassword) {
      return { error: "Password lama salah" }
    }

    const newPasswordHash = await bcrypt.hash(params.newPassword, 10)
    await pool.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [newPasswordHash, userId]
    )
  } catch (error) {
    console.error("Change password error:", error)
    return { error: "Gagal mengubah password" }
  }

  return { success: true }
}

// ---------------------------------------------------------
// ZONA BAHAYA: Backup, Restore, Reset
// ---------------------------------------------------------

export type BackupRow = {
  id?: string
  tanggal_waktu: string
  jenis_kendaraan_id: string
  plat_nomor: string | null
  tarif_total: number
  tarif_jatah_karyawan: number
  tarif_jatah_pemilik: number
  kasir_id: string
}

export async function fetchAllTransaksiForBackup(): Promise<{ data: BackupRow[]; error?: string }> {
  const { error: authError } = await requireAdmin()
  if (authError) return { data: [], error: authError }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id
      FROM transaksi
      ORDER BY tanggal_waktu ASC
    `)

    const data = rows.map(r => ({
      ...r,
      id: r.id,
      tanggal_waktu: utcSqlToIso(r.tanggal_waktu),
      tarif_total: Number(r.tarif_total),
      tarif_jatah_karyawan: Number(r.tarif_jatah_karyawan),
      tarif_jatah_pemilik: Number(r.tarif_jatah_pemilik)
    }))

    return { data: data as BackupRow[] }
  } catch (error) {
    console.error("Fetch backup error:", error)
    return { data: [], error: "Gagal mengambil data untuk backup" }
  }
}

export async function restoreTransaksiBackup(params: {
  rows: BackupRow[]
  mode: "append" | "replace"
}) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  if (!Array.isArray(params.rows) || params.rows.length === 0) {
    return { error: "File backup kosong atau tidak valid" }
  }

  for (const row of params.rows) {
    if (
      !row.tanggal_waktu ||
      !row.jenis_kendaraan_id ||
      typeof row.tarif_total !== "number" ||
      typeof row.tarif_jatah_karyawan !== "number" ||
      typeof row.tarif_jatah_pemilik !== "number" ||
      !row.kasir_id
    ) {
      return { error: "Format file backup tidak sesuai. Pastikan file belum diubah manual." }
    }
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    if (params.mode === "replace") {
      await connection.query("DELETE FROM transaksi")
    }

    const CHUNK_SIZE = 500
    for (let i = 0; i < params.rows.length; i += CHUNK_SIZE) {
      const chunk = params.rows.slice(i, i + CHUNK_SIZE)
      const values = chunk.map(row => {
        const dateObj = new Date(row.tanggal_waktu)
        if (Number.isNaN(dateObj.getTime())) throw new Error("Tanggal backup tidak valid")
        const formattedDate = dateObj.toISOString().slice(0, 19).replace("T", " ")

        return [
          row.id || crypto.randomUUID(),
          formattedDate,
          row.jenis_kendaraan_id, 
          row.plat_nomor, 
          row.tarif_total, 
          row.tarif_jatah_karyawan, 
          row.tarif_jatah_pemilik, 
          row.kasir_id
        ]
      })
      
      await connection.query(
        "INSERT IGNORE INTO transaksi (id, tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id) VALUES ?",
        [values]
      )
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    console.error("Restore insert error:", error)
    return {
      error: `Gagal restore data. Kemungkinan ada jenis_kendaraan_id atau kasir_id yang sudah tidak ada di database. ${params.mode === "replace" ? "PERHATIAN: data lama mungkin sudah terhapus." : ""}`,
    }
  } finally {
    connection.release()
  }

  revalidatePath("/admin", "layout")
  return { success: true, jumlahRestored: params.rows.length }
}

export async function resetTransaksiData() {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  try {
    await pool.query("DELETE FROM transaksi")
  } catch (error) {
    console.error("Reset data error:", error)
    return { error: "Gagal menghapus data transaksi" }
  }

  revalidatePath("/admin", "layout")
  return { success: true }
}