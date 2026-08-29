"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { requireAdmin } from "@/lib/authz"
import pool from "@/lib/db"
import bcrypt from "bcryptjs"
import type { RowDataPacket } from "mysql2"
import { utcSqlToIso } from "@/lib/datetime"
import { logActivity, type ActivityActor } from "@/lib/activityLog"
import { MAX_LOGIN_TIMEOUT_MINUTES, MIN_LOGIN_TIMEOUT_MINUTES, setLoginTimeoutMinutes } from "@/lib/loginTimeout"

function toActor(user: { id: string; username: string; role: string } | null): ActivityActor {
  if (!user) return null
  return { id: user.id, username: user.username, role: user.role as "admin" | "kasir" }
}

export async function updateLoginTimeout(minutes: number) {
  const { error, user } = await requireAdmin()
  if (error || !user) return { error: error ?? "Anda harus login" }
  if (!Number.isInteger(minutes) || minutes < MIN_LOGIN_TIMEOUT_MINUTES || minutes > MAX_LOGIN_TIMEOUT_MINUTES) {
    return { error: "Timeout harus antara 5 menit dan 7 hari" }
  }

  await setLoginTimeoutMinutes(minutes)
  await logActivity({
    actor: toActor(user),
    action: "UPDATE",
    entityType: "pengaturan",
    entityId: null,
    description: `Mengubah timeout login menjadi ${minutes} menit`,
    newValue: { login_timeout_minutes: minutes },
  })
  revalidatePath("/admin", "layout")
  return { success: true }
}

// ---------------------------------------------------------
// AKUN SAYA
// ---------------------------------------------------------

export async function updateOwnProfile(namaLengkap: string) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  const username = (session?.user as any)?.name
  if (!userId) return { error: "Anda harus login" }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT nama_lengkap FROM users WHERE id = ? LIMIT 1",
      [userId]
    )
    const oldNama = rows[0]?.nama_lengkap ?? null

    await pool.query(
      "UPDATE users SET nama_lengkap = ? WHERE id = ?",
      [namaLengkap.trim() || null, userId]
    )

    await logActivity({
      actor: { id: userId, username },
      action: "UPDATE",
      entityType: "user",
      entityId: userId,
      description: "Mengubah nama lengkap akun sendiri",
      oldValue: { nama_lengkap: oldNama },
      newValue: { nama_lengkap: namaLengkap.trim() || null },
    })
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
  const oldUsername = (session?.user as any)?.name
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

  await logActivity({
    actor: { id: userId, username: clean },
    action: "UPDATE",
    entityType: "user",
    entityId: userId,
    description: `Mengubah username sendiri dari "${oldUsername ?? "?"}" menjadi "${clean}"`,
    oldValue: { username: oldUsername ?? null },
    newValue: { username: clean },
  })

  revalidatePath("/pengaturan") // sesuaikan dengan route halaman ini
  return { success: true }
}

export async function changeOwnPassword(params: {
  currentPassword: string
  newPassword: string
}) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  const username = (session?.user as any)?.name
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

    // Tidak pernah menyimpan old_value/new_value untuk password, meski sudah
    // di-hash - cukup catat bahwa aksinya terjadi.
    await logActivity({
      actor: { id: userId, username },
      action: "UPDATE",
      entityType: "auth",
      entityId: userId,
      description: "Mengubah password akun sendiri",
    })
  } catch (error) {
    console.error("Change password error:", error)
    return { error: "Gagal mengubah password" }
  }

  return { success: true }
}

// ---------------------------------------------------------
// BACKUP & PEMULIHAN
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
  const { error: authError, user: currentUser } = await requireAdmin()
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

    await logActivity({
      actor: toActor(currentUser as any),
      action: "EXPORT",
      entityType: "laporan",
      description: `Mengekspor backup seluruh data transaksi (${data.length} baris)`,
      newValue: { jumlah_baris: data.length },
    })

    return { data: data as BackupRow[] }
  } catch (error) {
    console.error("Fetch backup error:", error)
    return { data: [], error: "Gagal mengambil data untuk backup" }
  }
}

export async function restoreTransaksiBackup(params: {
  rows: BackupRow[]
}) {
  const { error: authError, user: currentUser } = await requireAdmin()
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
      error: "Gagal restore data. Kemungkinan ada jenis_kendaraan_id atau kasir_id yang sudah tidak ada di database.",
    }
  } finally {
    connection.release()
  }

  await logActivity({
    actor: toActor(currentUser as any),
    action: "CREATE",
    entityType: "laporan",
    description: `Restore backup transaksi dengan mode aman/append (${params.rows.length} baris)`,
    newValue: { mode: "append", jumlah_baris: params.rows.length },
  })

  revalidatePath("/admin", "layout")
  return { success: true, jumlahRestored: params.rows.length }
}
