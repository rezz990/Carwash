"use server"

import { revalidatePath } from "next/cache"
import pool from "@/lib/db"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import { requireAdmin, type CurrentUser } from "@/lib/authz"
import { logActivity, type ActivityActor } from "@/lib/activityLog"

const MAX_AMOUNT = 10_000_000_000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toActor(user: CurrentUser): ActivityActor {
  return { id: user.id, username: user.username, role: user.role }
}

function validateAmounts(tarif: number, employeeShare: number): string | null {
  if (!Number.isFinite(tarif) || !Number.isFinite(employeeShare)) return "Tarif harus berupa angka"
  if (tarif < 0 || employeeShare < 0) return "Tarif dan bagian karyawan tidak boleh negatif"
  if (tarif > MAX_AMOUNT || employeeShare > MAX_AMOUNT) return "Nilai tarif terlalu besar"
  if (Math.round(tarif * 100) !== tarif * 100 || Math.round(employeeShare * 100) !== employeeShare * 100) return "Tarif maksimal memiliki dua angka desimal"
  if (employeeShare > tarif) return "Bagian karyawan tidak boleh melebihi tarif total"
  return null
}

function mysqlCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined
}

function refreshTariffPages() {
  revalidatePath("/admin")
  revalidatePath("/admin/tarif")
}

export async function updateTarifDefault(id: string, tarifDefault: number, jatahKaryawan: number) {
  const { error: authError, user } = await requireAdmin()
  if (authError || !user) return { error: authError ?? "Anda harus login" }
  if (!UUID_PATTERN.test(id)) return { error: "ID jenis kendaraan tidak valid" }
  const validationError = validateAmounts(tarifDefault, jatahKaryawan)
  if (validationError) return { error: validationError }

  const jatahPemilik = tarifDefault - jatahKaryawan
  const connection = await pool.getConnection()
  let target: RowDataPacket | undefined
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik FROM jenis_kendaraan WHERE id = ? LIMIT 1 FOR UPDATE",
      [id],
    )
    target = rows[0]
    if (!target) {
      await connection.rollback()
      return { error: "Jenis kendaraan tidak ditemukan" }
    }
    const [result] = await connection.query<ResultSetHeader>(
      "UPDATE jenis_kendaraan SET tarif_default = ?, jatah_karyawan = ?, jatah_pemilik = ? WHERE id = ?",
      [tarifDefault, jatahKaryawan, jatahPemilik, id],
    )
    if (result.affectedRows !== 1) throw new Error("Update tarif tidak mengubah satu baris")
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    console.error("Update tarif error:", error)
    return { error: "Gagal memperbarui tarif" }
  } finally {
    connection.release()
  }

  await logActivity({
    actor: toActor(user), action: "UPDATE", entityType: "tarif", entityId: id,
    description: `Mengubah tarif "${target?.kategori} ${target?.ukuran}" menjadi Rp${tarifDefault.toLocaleString("id-ID")}`,
    oldValue: target ? { tarif_default: Number(target.tarif_default), jatah_karyawan: Number(target.jatah_karyawan), jatah_pemilik: Number(target.jatah_pemilik) } : undefined,
    newValue: { tarif_default: tarifDefault, jatah_karyawan: jatahKaryawan, jatah_pemilik: jatahPemilik },
  })
  refreshTariffPages()
  return { success: true }
}

export async function toggleAktifJenisKendaraan(id: string, aktif: boolean) {
  const { error: authError, user } = await requireAdmin()
  if (authError || !user) return { error: authError ?? "Anda harus login" }
  if (!UUID_PATTERN.test(id) || typeof aktif !== "boolean") return { error: "Data status tidak valid" }

  const connection = await pool.getConnection()
  let target: RowDataPacket | undefined
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT kategori, ukuran, aktif FROM jenis_kendaraan WHERE id = ? LIMIT 1 FOR UPDATE", [id],
    )
    target = rows[0]
    if (!target) {
      await connection.rollback()
      return { error: "Jenis kendaraan tidak ditemukan" }
    }
    const [result] = await connection.query<ResultSetHeader>("UPDATE jenis_kendaraan SET aktif = ? WHERE id = ?", [aktif, id])
    if (result.affectedRows !== 1) throw new Error("Update status tidak mengubah satu baris")
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    console.error("Toggle aktif error:", error)
    return { error: "Gagal mengubah status kendaraan" }
  } finally {
    connection.release()
  }

  await logActivity({
    actor: toActor(user), action: "UPDATE", entityType: "tarif", entityId: id,
    description: `${aktif ? "Mengaktifkan" : "Menonaktifkan"} jenis kendaraan "${target?.kategori} ${target?.ukuran}"`,
    oldValue: { aktif: Boolean(target?.aktif) }, newValue: { aktif },
  })
  refreshTariffPages()
  return { success: true }
}

export async function createJenisKendaraan(params: { kategori: string; ukuran: string; tarifDefault: number; jatahKaryawan: number }) {
  const { error: authError, user } = await requireAdmin()
  if (authError || !user) return { error: authError ?? "Anda harus login" }
  const kategori = params.kategori.trim().replace(/\s+/g, " ")
  const ukuran = params.ukuran.trim().replace(/\s+/g, " ")
  if (!kategori || !ukuran) return { error: "Kategori dan ukuran wajib diisi" }
  if (kategori.length > 50 || ukuran.length > 50) return { error: "Kategori dan ukuran maksimal 50 karakter" }
  const validationError = validateAmounts(params.tarifDefault, params.jatahKaryawan)
  if (validationError) return { error: validationError }

  const jatahPemilik = params.tarifDefault - params.jatahKaryawan
  const newId = crypto.randomUUID()
  try {
    await pool.query(
      "INSERT INTO jenis_kendaraan (id, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik, aktif) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [newId, kategori, ukuran, params.tarifDefault, params.jatahKaryawan, jatahPemilik, true],
    )
  } catch (error) {
    console.error("Create jenis kendaraan error:", error)
    if (mysqlCode(error) === "ER_DUP_ENTRY") return { error: `Jenis kendaraan "${kategori} ${ukuran}" sudah ada` }
    return { error: "Gagal menambahkan jenis kendaraan" }
  }

  await logActivity({
    actor: toActor(user), action: "CREATE", entityType: "tarif", entityId: newId,
    description: `Menambahkan jenis kendaraan "${kategori} ${ukuran}"`,
    newValue: { kategori, ukuran, tarif_default: params.tarifDefault, jatah_karyawan: params.jatahKaryawan, jatah_pemilik: jatahPemilik },
  })
  refreshTariffPages()
  return { success: true }
}
