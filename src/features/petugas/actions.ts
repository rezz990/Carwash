"use server"

import { revalidatePath } from "next/cache"
import { isUuid } from "@/lib/ids"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import pool, { mysqlCode } from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import { logActivity, toActivityActor } from "@/lib/activityLog"

export type Petugas = {
  id: string
  nama: string
  aktif: boolean
  total_transaksi: number
}

const MAX_NAMA_LENGTH = 100

function normalizeNama(raw: string): string {
  return raw.trim().replace(/\s+/g, " ")
}

function validateNama(nama: string): string | null {
  if (!nama) return "Nama petugas wajib diisi"
  if (nama.length > MAX_NAMA_LENGTH) return `Nama petugas maksimal ${MAX_NAMA_LENGTH} karakter`
  return null
}

function refreshPetugasPage() {
  revalidatePath("/admin/petugas")
}

export async function fetchPetugas(): Promise<{ data: Petugas[]; error?: string }> {
  const { error: authError } = await requireAdmin()
  if (authError) return { data: [], error: authError }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT p.id, p.nama, p.aktif, COUNT(t.id) AS total_transaksi
      FROM petugas_cuci p
      LEFT JOIN transaksi t ON t.petugas_id = p.id
      GROUP BY p.id, p.nama, p.aktif
      ORDER BY p.aktif DESC, p.nama ASC
    `)
    const data: Petugas[] = rows.map((row) => ({
      id: String(row.id),
      nama: String(row.nama),
      aktif: Boolean(row.aktif),
      total_transaksi: Number(row.total_transaksi) || 0,
    }))
    return { data }
  } catch (error) {
    console.error("fetchPetugas error:", error)
    return { data: [], error: "Daftar petugas gagal dimuat. Coba muat ulang halaman." }
  }
}

export async function createPetugas(params: { nama: string }) {
  const { error: authError, user } = await requireAdmin()
  if (authError || !user) return { error: authError ?? "Anda harus login" }
  const nama = normalizeNama(params.nama)
  const validationError = validateNama(nama)
  if (validationError) return { error: validationError }

  const newId = crypto.randomUUID()
  try {
    await pool.query("INSERT INTO petugas_cuci (id, nama, aktif) VALUES (?, ?, ?)", [newId, nama, true])
  } catch (error) {
    console.error("Create petugas error:", error)
    if (mysqlCode(error) === "ER_DUP_ENTRY") return { error: `Petugas "${nama}" sudah ada` }
    return { error: "Gagal menambahkan petugas" }
  }

  await logActivity({
    actor: toActivityActor(user), action: "CREATE", entityType: "petugas", entityId: newId,
    description: `Menambahkan petugas cuci "${nama}"`,
    newValue: { nama, aktif: true },
  })
  refreshPetugasPage()
  return { success: true }
}

export async function updatePetugas(id: string, namaRaw: string) {
  const { error: authError, user } = await requireAdmin()
  if (authError || !user) return { error: authError ?? "Anda harus login" }
  if (!isUuid(id)) return { error: "ID petugas tidak valid" }
  const nama = normalizeNama(namaRaw)
  const validationError = validateNama(nama)
  if (validationError) return { error: validationError }

  const connection = await pool.getConnection()
  let target: RowDataPacket | undefined
  let unchanged = false
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT nama FROM petugas_cuci WHERE id = ? LIMIT 1 FOR UPDATE", [id],
    )
    target = rows[0]
    if (!target) {
      await connection.rollback()
      return { error: "Petugas tidak ditemukan" }
    }
    if (String(target.nama) === nama) {
      unchanged = true
      await connection.rollback()
    } else {
      const [result] = await connection.query<ResultSetHeader>(
        "UPDATE petugas_cuci SET nama = ? WHERE id = ?", [nama, id],
      )
      if (result.affectedRows !== 1) throw new Error("Update petugas tidak mengubah satu baris")
      await connection.commit()
    }
  } catch (error) {
    await connection.rollback()
    console.error("Update petugas error:", error)
    if (mysqlCode(error) === "ER_DUP_ENTRY") return { error: `Petugas "${nama}" sudah ada` }
    return { error: "Gagal memperbarui petugas" }
  } finally {
    connection.release()
  }

  if (!unchanged) {
    await logActivity({
      actor: toActivityActor(user), action: "UPDATE", entityType: "petugas", entityId: id,
      description: `Mengubah nama petugas "${target?.nama}" menjadi "${nama}"`,
      oldValue: { nama: target?.nama },
      newValue: { nama },
    })
    refreshPetugasPage()
  }
  return { success: true }
}

export async function toggleAktifPetugas(id: string, aktif: boolean) {
  const { error: authError, user } = await requireAdmin()
  if (authError || !user) return { error: authError ?? "Anda harus login" }
  if (!isUuid(id) || typeof aktif !== "boolean") return { error: "Data status tidak valid" }

  const connection = await pool.getConnection()
  let target: RowDataPacket | undefined
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT nama, aktif FROM petugas_cuci WHERE id = ? LIMIT 1 FOR UPDATE", [id],
    )
    target = rows[0]
    if (!target) {
      await connection.rollback()
      return { error: "Petugas tidak ditemukan" }
    }
    const [result] = await connection.query<ResultSetHeader>("UPDATE petugas_cuci SET aktif = ? WHERE id = ?", [aktif, id])
    if (result.affectedRows !== 1) throw new Error("Update status petugas tidak mengubah satu baris")
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    console.error("Toggle aktif petugas error:", error)
    return { error: "Gagal mengubah status petugas" }
  } finally {
    connection.release()
  }

  await logActivity({
    actor: toActivityActor(user), action: "UPDATE", entityType: "petugas", entityId: id,
    description: `${aktif ? "Mengaktifkan" : "Menonaktifkan"} petugas cuci "${target?.nama}"`,
    oldValue: { aktif: Boolean(target?.aktif) }, newValue: { aktif },
  })
  refreshPetugasPage()
  return { success: true }
}
