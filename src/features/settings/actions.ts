"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import pool, { mysqlCode } from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import { utcSqlToIso } from "@/lib/datetime"
import { logActivity, toActivityActor } from "@/lib/activityLog"
import { MAX_LOGIN_TIMEOUT_MINUTES, MIN_LOGIN_TIMEOUT_MINUTES, setLoginTimeoutMinutes } from "@/lib/loginTimeout"
import { MAX_BACKUP_ROWS, insertBackupRows, validateTransactionBackup, type BackupRow } from "@/lib/transactionBackup"

export async function updateLoginTimeout(minutes: number) {
  const { error, user } = await requireAdmin()
  if (error || !user) return { error: error ?? "Anda harus login" }
  if (!Number.isInteger(minutes) || minutes < MIN_LOGIN_TIMEOUT_MINUTES || minutes > MAX_LOGIN_TIMEOUT_MINUTES) return { error: "Timeout harus antara 5 menit dan 7 hari" }
  try {
    await setLoginTimeoutMinutes(minutes)
  } catch (cause) {
    console.error("Update login timeout error:", cause)
    return { error: "Timeout login belum tersimpan" }
  }
  await logActivity({ actor: toActivityActor(user), action: "UPDATE", entityType: "pengaturan", description: `Mengubah timeout login menjadi ${minutes} menit`, newValue: { login_timeout_minutes: minutes } })
  revalidatePath("/admin", "layout")
  return { success: true }
}

export async function updateOwnAccount(params: { namaLengkap: string; username: string }) {
  const { user, error } = await requireAdmin()
  if (error || !user) return { error: error ?? "Anda harus login" }
  const username = params.username.trim().toLowerCase()
  const name = params.namaLengkap.trim().replace(/\s+/g, " ")
  if (!/^[a-z0-9_]{3,64}$/.test(username)) return { error: "Username harus 3–64 karakter dan hanya berisi huruf kecil, angka, atau underscore" }
  if (name.length > 255) return { error: "Nama lengkap maksimal 255 karakter" }

  const connection = await pool.getConnection()
  let previous: RowDataPacket | undefined
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>("SELECT username, nama_lengkap FROM users WHERE id = ? LIMIT 1 FOR UPDATE", [user.id])
    previous = rows[0]
    if (!previous) {
      await connection.rollback()
      return { error: "User tidak ditemukan" }
    }
    const [result] = await connection.query<ResultSetHeader>("UPDATE users SET username = ?, nama_lengkap = ? WHERE id = ?", [username, name || null, user.id])
    if (result.affectedRows !== 1) throw new Error("Update profil tidak mengubah satu baris")
    await connection.commit()
  } catch (cause) {
    await connection.rollback()
    console.error("Update own account error:", cause)
    if (mysqlCode(cause) === "ER_DUP_ENTRY") return { error: "Username sudah dipakai user lain" }
    return { error: "Profil belum tersimpan" }
  } finally {
    connection.release()
  }

  await logActivity({ actor: toActivityActor(user), action: "UPDATE", entityType: "user", entityId: user.id, description: "Memperbarui profil akun sendiri", oldValue: previous ? { username: previous.username, nama_lengkap: previous.nama_lengkap } : undefined, newValue: { username, nama_lengkap: name || null } })
  revalidatePath("/admin", "layout")
  revalidatePath("/admin/pengaturan")
  return { success: true }
}

export async function changeOwnPassword(params: { currentPassword: string; newPassword: string }) {
  const { user, error } = await requireAdmin()
  if (error || !user) return { error: error ?? "Anda harus login" }
  if (params.newPassword.length < 8 || params.newPassword.length > 128) return { error: "Password baru harus 8–128 karakter" }
  if (params.currentPassword === params.newPassword) return { error: "Password baru harus berbeda dari password lama" }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>("SELECT password_hash FROM users WHERE id = ? LIMIT 1 FOR UPDATE", [user.id])
    if (!rows[0]) {
      await connection.rollback()
      return { error: "User tidak ditemukan" }
    }
    if (!await bcrypt.compare(params.currentPassword, String(rows[0].password_hash))) {
      await connection.rollback()
      return { error: "Password lama salah" }
    }
    const passwordHash = await bcrypt.hash(params.newPassword, 10)
    const [result] = await connection.query<ResultSetHeader>("UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?", [passwordHash, user.id])
    if (result.affectedRows !== 1) throw new Error("Update password tidak mengubah satu baris")
    await connection.query("DELETE FROM mobile_sessions WHERE user_id = ?", [user.id])
    await connection.commit()
  } catch (cause) {
    await connection.rollback()
    console.error("Change password error:", cause)
    return { error: "Password belum berubah" }
  } finally {
    connection.release()
  }

  await logActivity({ actor: toActivityActor(user), action: "UPDATE", entityType: "auth", entityId: user.id, description: "Mengubah password akun sendiri dan mencabut semua sesi aktif" })
  return { success: true }
}

export async function fetchAllTransaksiForBackup(): Promise<{ data: BackupRow[]; error?: string }> {
  const { error, user } = await requireAdmin()
  if (error || !user) return { data: [], error: error ?? "Anda harus login" }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total,
             tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id
      FROM transaksi ORDER BY tanggal_waktu ASC LIMIT ?
    `, [MAX_BACKUP_ROWS + 1])
    if (rows.length > MAX_BACKUP_ROWS) return { data: [], error: `Data melebihi ${MAX_BACKUP_ROWS.toLocaleString("id-ID")} transaksi. Gunakan backup database dari hosting.` }
    const data: BackupRow[] = rows.map((row) => ({
      id: String(row.id), tanggal_waktu: utcSqlToIso(row.tanggal_waktu), jenis_kendaraan_id: String(row.jenis_kendaraan_id),
      plat_nomor: row.plat_nomor ? String(row.plat_nomor) : null, tarif_total: Number(row.tarif_total),
      tarif_jatah_karyawan: Number(row.tarif_jatah_karyawan), tarif_jatah_pemilik: Number(row.tarif_jatah_pemilik), kasir_id: String(row.kasir_id),
    }))
    await logActivity({ actor: toActivityActor(user), action: "EXPORT", entityType: "laporan", description: `Mengekspor salinan ${data.length} transaksi`, newValue: { jumlah_baris: data.length } })
    return { data }
  } catch (cause) {
    console.error("Fetch backup error:", cause)
    return { data: [], error: "Gagal menyiapkan salinan transaksi" }
  }
}

export async function restoreTransaksiBackup(params: { rows: unknown }) {
  const { error, user } = await requireAdmin()
  if (error || !user) return { error: error ?? "Anda harus login" }
  let rows: BackupRow[]
  try { rows = validateTransactionBackup(params.rows) }
  catch (cause) { return { error: cause instanceof Error ? cause.message : "File salinan tidak valid" } }

  const connection = await pool.getConnection()
  try {
    const result = await insertBackupRows(connection, rows)
    await logActivity({ actor: toActivityActor(user), action: "CREATE", entityType: "laporan", description: `Pemulihan transaksi: ${result.inserted} ditambahkan, ${result.skipped} dilewati`, newValue: { mode: "append", inserted: result.inserted, skipped: result.skipped } })
    revalidatePath("/admin", "layout")
    return { success: true, jumlahRestored: result.inserted, jumlahSkipped: result.skipped }
  } catch (cause) {
    console.error("Restore transaksi error:", cause)
    return { error: "Pemulihan dibatalkan tanpa menambah data. Pastikan user dan jenis kendaraan dari file masih tersedia." }
  } finally {
    connection.release()
  }
}
