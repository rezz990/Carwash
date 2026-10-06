"use server"

import { revalidatePath } from "next/cache"
import { isUuid } from "@/lib/ids"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import pool, { mysqlCode } from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import { logActivity, toActivityActor } from "@/lib/activityLog"
import { jakartaDateToUtcSql, todayJakarta, utcSqlToIso } from "@/lib/datetime"
import { startOfMonthWib, startOfWeekWib } from "@/lib/formatters"

export type Petugas = {
  id: string
  nama: string
  aktif: boolean
  total_transaksi: number
  total_mobil: number
  total_motor: number
  hari_ini: number
  bulan_ini: number
  terakhir_transaksi: string | null
}

export type PetugasSummary = {
  total_petugas: number
  petugas_aktif: number
  petugas_nonaktif: number
  cuci_hari_ini: number
  mobil_hari_ini: number
  motor_hari_ini: number
}

export type PetugasRiwayatItem = {
  id: string
  tanggal_waktu: string
  plat_nomor: string | null
  kategori: string
  ukuran: string
  kasir_nama: string | null
  tarif_total: number
}

export type PetugasDetailResult = {
  petugas: { id: string; nama: string; aktif: boolean } | null
  ringkasan: {
    total: number
    mobil: number
    motor: number
    hari_ini: number
    minggu_ini: number
    bulan_ini: number
    terakhir: string | null
  }
  riwayat: PetugasRiwayatItem[]
  total: number
  page: number
  pageSize: number
  error?: string
}

const RIWAYAT_PAGE_SIZE = 20
const emptySummary: PetugasSummary = {
  total_petugas: 0, petugas_aktif: 0, petugas_nonaktif: 0,
  cuci_hari_ini: 0, mobil_hari_ini: 0, motor_hari_ini: 0,
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

export async function fetchPetugas(): Promise<{ data: Petugas[]; summary: PetugasSummary; error?: string }> {
  const { error: authError } = await requireAdmin()
  if (authError) return { data: [], summary: emptySummary, error: authError }

  const todayStr = todayJakarta()
  const todayStart = jakartaDateToUtcSql(todayStr)
  const todayEnd = jakartaDateToUtcSql(todayStr, true)
  const monthStart = jakartaDateToUtcSql(startOfMonthWib(todayStr))

  try {
    const [[rows], [summaryRows]] = await Promise.all([
      pool.query<RowDataPacket[]>(`
        SELECT p.id, p.nama, p.aktif,
               COUNT(t.id) AS total_transaksi,
               COALESCE(SUM(CASE WHEN LOWER(jk.kategori) = 'mobil' THEN 1 ELSE 0 END), 0) AS total_mobil,
               COALESCE(SUM(CASE WHEN LOWER(jk.kategori) = 'motor' THEN 1 ELSE 0 END), 0) AS total_motor,
               SUM(CASE WHEN t.tanggal_waktu >= ? THEN 1 ELSE 0 END) AS hari_ini,
               SUM(CASE WHEN t.tanggal_waktu >= ? THEN 1 ELSE 0 END) AS bulan_ini,
               MAX(t.tanggal_waktu) AS terakhir
        FROM petugas_cuci p
        LEFT JOIN transaksi t ON t.petugas_id = p.id
        LEFT JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id
        GROUP BY p.id, p.nama, p.aktif
        ORDER BY p.aktif DESC, p.nama ASC
      `, [todayStart, monthStart]),
      pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) AS total,
               COALESCE(SUM(CASE WHEN LOWER(jk.kategori) = 'mobil' THEN 1 ELSE 0 END), 0) AS mobil,
               COALESCE(SUM(CASE WHEN LOWER(jk.kategori) = 'motor' THEN 1 ELSE 0 END), 0) AS motor
        FROM transaksi t
        LEFT JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id
        WHERE t.petugas_id IS NOT NULL AND t.tanggal_waktu >= ? AND t.tanggal_waktu <= ?
      `, [todayStart, todayEnd]),
    ])

    const data: Petugas[] = rows.map((row) => ({
      id: String(row.id),
      nama: String(row.nama),
      aktif: Boolean(row.aktif),
      total_transaksi: Number(row.total_transaksi) || 0,
      total_mobil: Number(row.total_mobil) || 0,
      total_motor: Number(row.total_motor) || 0,
      hari_ini: Number(row.hari_ini) || 0,
      bulan_ini: Number(row.bulan_ini) || 0,
      terakhir_transaksi: row.terakhir ? utcSqlToIso(row.terakhir) : null,
    }))

    const summary: PetugasSummary = {
      total_petugas: data.length,
      petugas_aktif: data.filter((item) => item.aktif).length,
      petugas_nonaktif: data.filter((item) => !item.aktif).length,
      cuci_hari_ini: Number(summaryRows[0]?.total) || 0,
      mobil_hari_ini: Number(summaryRows[0]?.mobil) || 0,
      motor_hari_ini: Number(summaryRows[0]?.motor) || 0,
    }
    return { data, summary }
  } catch (error) {
    console.error("fetchPetugas error:", error)
    return { data: [], summary: emptySummary, error: "Daftar petugas gagal dimuat. Coba muat ulang halaman." }
  }
}

export async function fetchPetugasDetail(params: { id: string; page?: number }): Promise<PetugasDetailResult> {
  const { error: authError } = await requireAdmin()
  const page = Number.isSafeInteger(params.page) ? Math.max(1, params.page ?? 1) : 1
  const empty: PetugasDetailResult = {
    petugas: null,
    ringkasan: { total: 0, mobil: 0, motor: 0, hari_ini: 0, minggu_ini: 0, bulan_ini: 0, terakhir: null },
    riwayat: [], total: 0, page, pageSize: RIWAYAT_PAGE_SIZE,
  }
  if (authError) return { ...empty, error: authError }
  if (!isUuid(params.id)) return { ...empty, error: "ID petugas tidak valid" }

  const todayStr = todayJakarta()
  const todayStart = jakartaDateToUtcSql(todayStr)
  const weekStart = jakartaDateToUtcSql(startOfWeekWib(todayStr))
  const monthStart = jakartaDateToUtcSql(startOfMonthWib(todayStr))

  try {
    const [[petugasRows], [ringkasanRows], [riwayatRows], [countRows]] = await Promise.all([
      pool.query<RowDataPacket[]>("SELECT id, nama, aktif FROM petugas_cuci WHERE id = ? LIMIT 1", [params.id]),
      pool.query<RowDataPacket[]>(`
        SELECT COUNT(t.id) AS total,
               COALESCE(SUM(CASE WHEN LOWER(jk.kategori) = 'mobil' THEN 1 ELSE 0 END), 0) AS mobil,
               COALESCE(SUM(CASE WHEN LOWER(jk.kategori) = 'motor' THEN 1 ELSE 0 END), 0) AS motor,
               SUM(CASE WHEN t.tanggal_waktu >= ? THEN 1 ELSE 0 END) AS hari_ini,
               SUM(CASE WHEN t.tanggal_waktu >= ? THEN 1 ELSE 0 END) AS minggu_ini,
               SUM(CASE WHEN t.tanggal_waktu >= ? THEN 1 ELSE 0 END) AS bulan_ini,
               MAX(t.tanggal_waktu) AS terakhir
        FROM transaksi t
        LEFT JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id
        WHERE t.petugas_id = ?
      `, [todayStart, weekStart, monthStart, params.id]),
      pool.query<RowDataPacket[]>(`
        SELECT t.id, t.tanggal_waktu, t.plat_nomor, t.tarif_total, jk.kategori, jk.ukuran, u.username, u.nama_lengkap
        FROM transaksi t
        LEFT JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id
        LEFT JOIN users u ON u.id = t.kasir_id
        WHERE t.petugas_id = ?
        ORDER BY t.tanggal_waktu DESC, t.id DESC
        LIMIT ? OFFSET ?
      `, [params.id, RIWAYAT_PAGE_SIZE, (page - 1) * RIWAYAT_PAGE_SIZE]),
      pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM transaksi WHERE petugas_id = ?", [params.id]),
    ])

    const petugasRow = petugasRows[0]
    if (!petugasRow) return { ...empty, error: "Petugas tidak ditemukan" }

    const r = ringkasanRows[0] ?? {}
    return {
      petugas: { id: String(petugasRow.id), nama: String(petugasRow.nama), aktif: Boolean(petugasRow.aktif) },
      ringkasan: {
        total: Number(r.total) || 0,
        mobil: Number(r.mobil) || 0,
        motor: Number(r.motor) || 0,
        hari_ini: Number(r.hari_ini) || 0,
        minggu_ini: Number(r.minggu_ini) || 0,
        bulan_ini: Number(r.bulan_ini) || 0,
        terakhir: r.terakhir ? utcSqlToIso(r.terakhir) : null,
      },
      riwayat: riwayatRows.map((row) => ({
        id: String(row.id),
        tanggal_waktu: utcSqlToIso(row.tanggal_waktu),
        plat_nomor: row.plat_nomor ?? null,
        kategori: row.kategori || "-",
        ukuran: row.ukuran || "-",
        kasir_nama: row.nama_lengkap || row.username || null,
        tarif_total: Number(row.tarif_total) || 0,
      })),
      total: Number(countRows[0]?.total) || 0,
      page,
      pageSize: RIWAYAT_PAGE_SIZE,
    }
  } catch (error) {
    console.error("Fetch detail petugas error:", error)
    return { ...empty, error: "Gagal memuat detail petugas" }
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
