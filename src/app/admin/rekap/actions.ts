"use server"

import { revalidatePath } from "next/cache"
import pool from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import type { RowDataPacket } from "mysql2"
import { BUSINESS_TIMEZONE, jakartaDateToUtcSql, utcSqlToDate, utcSqlToIso } from "@/lib/datetime"

export type RekapHarian = {
  tanggal: string 
  hari: string 
  motorKecil: number
  motorBesar: number
  mobilKecil: number
  mobilSedang: number
  mobilBesar: number
  totalMotor: number
  totalMobil: number
  pendapatanKotor: number
  bagianKaryawan: number
  pendapatanBersih: number
}

export type TransaksiDetail = {
  id: string
  tanggal_waktu: string
  plat_nomor: string | null
  tarif_total: number
  tarif_jatah_karyawan: number
  tarif_jatah_pemilik: number
  kategori: string
  ukuran: string
  kasir_nama: string | null 
}

export type RekapResult = {
  harian: RekapHarian[]
  detail: TransaksiDetail[]
  totalPendapatanKotor: number
  totalBagianKaryawan: number
  totalPendapatanBersih: number
  totalTransaksi: number
  rataRataPerHari: number
  error?: string
}

function getTanggalKeyJakarta(dateString: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIMEZONE }).format(utcSqlToDate(dateString))
}

function getHariJakarta(dateString: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: BUSINESS_TIMEZONE, weekday: "long" }).format(utcSqlToDate(dateString))
}

function getKategoriKey(kategori: string, ukuran: string): keyof Pick<RekapHarian, "motorKecil" | "motorBesar" | "mobilKecil" | "mobilSedang" | "mobilBesar"> | null {
  const k = kategori.toLowerCase()
  const u = ukuran.toLowerCase()
  if (k === "motor" && u === "kecil") return "motorKecil"
  if (k === "motor" && u === "besar") return "motorBesar"
  if (k === "mobil" && u === "kecil") return "mobilKecil"
  if (k === "mobil" && u === "sedang") return "mobilSedang"
  if (k === "mobil" && u === "besar") return "mobilBesar"
  return null
}

export async function fetchRekap(params: {
  dateFrom: string 
  dateTo: string 
}): Promise<RekapResult> {
  const { error: authError } = await requireAdmin()
  if (authError) {
    return { harian: [], detail: [], totalPendapatanKotor: 0, totalBagianKaryawan: 0, totalPendapatanBersih: 0, totalTransaksi: 0, rataRataPerHari: 0, error: authError }
  }

  const { dateFrom, dateTo } = params

  const startDate = jakartaDateToUtcSql(dateFrom)
  const endDate = jakartaDateToUtcSql(dateTo, true)

  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT t.id, t.tanggal_waktu, t.plat_nomor, t.tarif_total, t.tarif_jatah_karyawan, t.tarif_jatah_pemilik, 
             jk.kategori, jk.ukuran, u.username, u.nama_lengkap
      FROM transaksi t
      LEFT JOIN jenis_kendaraan jk ON t.jenis_kendaraan_id = jk.id
      LEFT JOIN users u ON t.kasir_id = u.id
      WHERE t.tanggal_waktu >= ? AND t.tanggal_waktu <= ?
      ORDER BY t.tanggal_waktu ASC
    `, [startDate, endDate])

    const harianMap = new Map<string, RekapHarian>()

    for (const row of rows) {
      const dateObj = utcSqlToDate(row.tanggal_waktu)
      const tanggalKey = getTanggalKeyJakarta(dateObj)

      if (!harianMap.has(tanggalKey)) {
        harianMap.set(tanggalKey, {
          tanggal: tanggalKey,
          hari: getHariJakarta(dateObj),
          motorKecil: 0,
          motorBesar: 0,
          mobilKecil: 0,
          mobilSedang: 0,
          mobilBesar: 0,
          totalMotor: 0,
          totalMobil: 0,
          pendapatanKotor: 0,
          bagianKaryawan: 0,
          pendapatanBersih: 0,
        })
      }

      const entry = harianMap.get(tanggalKey)!

      if (row.kategori && row.ukuran) {
        const key = getKategoriKey(row.kategori, row.ukuran)
        if (key) {
          entry[key] += 1
          if (key.startsWith("motor")) entry.totalMotor += 1
          else entry.totalMobil += 1
        }
      }

      entry.pendapatanKotor += Number(row.tarif_total) || 0
      entry.bagianKaryawan += Number(row.tarif_jatah_karyawan) || 0
      entry.pendapatanBersih += Number(row.tarif_jatah_pemilik) || 0
    }

    const harian = Array.from(harianMap.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal))

    const detail: TransaksiDetail[] = rows.map((row) => {
      const dateObj = utcSqlToDate(row.tanggal_waktu)
      return {
        id: row.id,
        tanggal_waktu: utcSqlToIso(row.tanggal_waktu),
        plat_nomor: row.plat_nomor,
        tarif_total: Number(row.tarif_total) || 0,
        tarif_jatah_karyawan: Number(row.tarif_jatah_karyawan) || 0,
        tarif_jatah_pemilik: Number(row.tarif_jatah_pemilik) || 0,
        kategori: row.kategori || "-",
        ukuran: row.ukuran || "-",
        kasir_nama: row.nama_lengkap || row.username || null,
      }
    }).reverse() 

    const totalPendapatanKotor = harian.reduce((acc, h) => acc + h.pendapatanKotor, 0)
    const totalBagianKaryawan = harian.reduce((acc, h) => acc + h.bagianKaryawan, 0)
    const totalPendapatanBersih = harian.reduce((acc, h) => acc + h.pendapatanBersih, 0)
    const totalTransaksi = rows.length
    const rataRataPerHari = harian.length > 0 ? totalPendapatanKotor / harian.length : 0

    return {
      harian,
      detail,
      totalPendapatanKotor,
      totalBagianKaryawan,
      totalPendapatanBersih,
      totalTransaksi,
      rataRataPerHari,
    }
  } catch (error) {
    console.error("Fetch rekap error:", error)
    return {
      harian: [],
      detail: [],
      totalPendapatanKotor: 0,
      totalBagianKaryawan: 0,
      totalPendapatanBersih: 0,
      totalTransaksi: 0,
      rataRataPerHari: 0,
      error: "Gagal memuat data rekap",
    }
  }
}

export async function updateTransaksi(params: {
  id: string
  jenisKendaraanId: string
  platNomor: string | null
}) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  try {
    const [jkRows] = await pool.query<RowDataPacket[]>(
      "SELECT tarif_default, jatah_karyawan, jatah_pemilik FROM jenis_kendaraan WHERE id = ?",
      [params.jenisKendaraanId]
    )

    if (jkRows.length === 0) {
      return { error: "Gagal mengambil data tarif kendaraan" }
    }

    const jenisKendaraan = jkRows[0]

    await pool.query(
      "UPDATE transaksi SET jenis_kendaraan_id = ?, plat_nomor = ?, tarif_total = ?, tarif_jatah_karyawan = ?, tarif_jatah_pemilik = ? WHERE id = ?",
      [
        params.jenisKendaraanId, 
        params.platNomor, 
        jenisKendaraan.tarif_default, 
        jenisKendaraan.jatah_karyawan, 
        jenisKendaraan.jatah_pemilik, 
        params.id
      ]
    )
  } catch (error) {
    console.error("Update transaksi error:", error)
    return { error: "Gagal mengubah transaksi" }
  }

  revalidatePath("/admin/rekap")
  return { success: true }
}

export async function deleteTransaksi(id: string) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  try {
    await pool.query("DELETE FROM transaksi WHERE id = ?", [id])
  } catch (error) {
    console.error("Delete transaksi error:", error)
    return { error: "Gagal menghapus transaksi" }
  }

  revalidatePath("/admin/rekap")
  return { success: true }
}

export async function fetchJenisKendaraanAktif() {
  const { error: authError } = await requireAdmin()
  if (authError) return []

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, kategori, ukuran FROM jenis_kendaraan WHERE aktif = 1 ORDER BY kategori DESC, ukuran ASC"
    )
    return rows as { id: string; kategori: string; ukuran: string }[]
  } catch (error) {
    console.error("Fetch jenis kendaraan error:", error)
    return []
  }
}