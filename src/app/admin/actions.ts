"use server"

import pool from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import type { RowDataPacket } from "mysql2"
import { addJakartaDays, jakartaDateToUtcSql, todayJakarta, utcSqlToDate, utcSqlToIso, BUSINESS_TIMEZONE } from "@/lib/datetime"

function getTanggalKeyJakarta(dateString: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIMEZONE }).format(utcSqlToDate(dateString))
}

function getTodayJakarta(): string {
  return todayJakarta()
}

export type OverviewStats = {
  pendapatanHariIni: number
  transaksiHariIni: number
  pendapatanKemarin: number
  persenPerubahan: number | null 
  jumlahKasirAktif: number
  rataRataPendapatan7Hari: number
  kategoriTerlarisMingguIni: string | null
  transaksiTerbaru: {
    id: string
    tanggal_waktu: string
    kategori: string
    ukuran: string
    plat_nomor: string | null
    tarif_total: number
  }[]
  error?: string
}

export async function fetchOverviewStats(): Promise<OverviewStats> {
  const { error: authError } = await requireAdmin()
  if (authError) return { pendapatanHariIni: 0, transaksiHariIni: 0, pendapatanKemarin: 0, persenPerubahan: null, jumlahKasirAktif: 0, rataRataPendapatan7Hari: 0, kategoriTerlarisMingguIni: null, transaksiTerbaru: [], error: authError }
  const todayStr = getTodayJakarta()

  const yesterdayStr = addJakartaDays(todayStr, -1)
  const sevenDaysAgoStr = addJakartaDays(todayStr, -6)

  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT t.tanggal_waktu, t.tarif_total, jk.kategori, jk.ukuran
      FROM transaksi t
      LEFT JOIN jenis_kendaraan jk ON t.jenis_kendaraan_id = jk.id
      WHERE t.tanggal_waktu >= ? AND t.tanggal_waktu <= ?
    `, [jakartaDateToUtcSql(sevenDaysAgoStr), jakartaDateToUtcSql(todayStr, true)])

    let pendapatanHariIni = 0
    let transaksiHariIni = 0
    let pendapatanKemarin = 0
    let totalPendapatan7Hari = 0
    const kategoriCount = new Map<string, number>()

    for (const row of rows) {
      const tglKey = getTanggalKeyJakarta(row.tanggal_waktu)
      const tarif = Number(row.tarif_total) || 0

      totalPendapatan7Hari += tarif

      if (tglKey === todayStr) {
        pendapatanHariIni += tarif
        transaksiHariIni += 1
      }
      if (tglKey === yesterdayStr) {
        pendapatanKemarin += tarif
      }
      if (row.kategori && row.ukuran) {
        const label = `${row.kategori} ${row.ukuran}`
        kategoriCount.set(label, (kategoriCount.get(label) || 0) + 1)
      }
    }

    let kategoriTerlarisMingguIni: string | null = null
    let maxCount = 0
    for (const [label, count] of kategoriCount.entries()) {
      if (count > maxCount) {
        maxCount = count
        kategoriTerlarisMingguIni = label
      }
    }

    const persenPerubahan =
      pendapatanKemarin > 0
        ? ((pendapatanHariIni - pendapatanKemarin) / pendapatanKemarin) * 100
        : null

    const [kasirRows] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(id) as count FROM users WHERE role = 'kasir' AND aktif = 1
    `)
    const jumlahKasirAktif = kasirRows[0].count

    const [terbaruRows] = await pool.query<RowDataPacket[]>(`
      SELECT t.id, t.tanggal_waktu, t.plat_nomor, t.tarif_total, jk.kategori, jk.ukuran
      FROM transaksi t
      LEFT JOIN jenis_kendaraan jk ON t.jenis_kendaraan_id = jk.id
      ORDER BY t.tanggal_waktu DESC
      LIMIT 5
    `)

    const transaksiTerbaru = terbaruRows.map((t) => ({
      id: t.id,
      tanggal_waktu: utcSqlToIso(t.tanggal_waktu),
      kategori: t.kategori || "-",
      ukuran: t.ukuran || "-",
      plat_nomor: t.plat_nomor,
      tarif_total: Number(t.tarif_total) || 0,
    }))

    return {
      pendapatanHariIni,
      transaksiHariIni,
      pendapatanKemarin,
      persenPerubahan,
      jumlahKasirAktif: Number(jumlahKasirAktif) || 0,
      rataRataPendapatan7Hari: totalPendapatan7Hari / 7,
      kategoriTerlarisMingguIni,
      transaksiTerbaru,
    }
  } catch (error) {
    console.error("Fetch overview stats error:", error)
    return {
      pendapatanHariIni: 0, transaksiHariIni: 0, pendapatanKemarin: 0,
      persenPerubahan: null, jumlahKasirAktif: 0, rataRataPendapatan7Hari: 0,
      kategoriTerlarisMingguIni: null, transaksiTerbaru: [],
      error: "Gagal memuat data overview",
    }
  }
}

export type ChartPoint = {
  label: string
  pendapatanKotor: number
  pendapatanBersih: number
}

const BULAN_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

export async function fetchChartData(params: {
  mode: "harian" | "bulanan" | "rentang"
  year: number
  month?: number 
  startYear?: number 
  startMonth?: number 
  endYear?: number 
  endMonth?: number 
}): Promise<{ data: ChartPoint[]; error?: string }> {
  const { error: authError } = await requireAdmin()
  if (authError) return { data: [], error: authError }

  const { mode, year, month, startYear, startMonth, endYear, endMonth } = params

  let startDateStr: string
  let endDateStr: string

  if (mode === "harian") {
    if (!month) return { data: [], error: "Bulan wajib diisi untuk mode harian" }
    const lastDay = new Date(year, month, 0).getDate()
    startDateStr = jakartaDateToUtcSql(`${year}-${String(month).padStart(2, "0")}-01`)
    endDateStr = jakartaDateToUtcSql(`${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`, true)
  } else if (mode === "bulanan") {
    startDateStr = jakartaDateToUtcSql(`${year}-01-01`)
    endDateStr = jakartaDateToUtcSql(`${year}-12-31`, true)
  } else {
    if (!startYear || !startMonth || !endYear || !endMonth) {
      return { data: [], error: "Rentang bulan (dari & sampai) wajib diisi" }
    }
    const startIdx = startYear * 12 + startMonth
    const endIdx = endYear * 12 + endMonth
    if (startIdx > endIdx) {
      return { data: [], error: "Bulan 'Dari' tidak boleh setelah bulan 'Sampai'" }
    }
    const lastDayEnd = new Date(endYear, endMonth, 0).getDate()
    startDateStr = jakartaDateToUtcSql(`${startYear}-${String(startMonth).padStart(2, "0")}-01`)
    endDateStr = jakartaDateToUtcSql(`${endYear}-${String(endMonth).padStart(2, "0")}-${String(lastDayEnd).padStart(2, "0")}`, true)
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT tanggal_waktu, tarif_total, tarif_jatah_pemilik
      FROM transaksi
      WHERE tanggal_waktu >= ? AND tanggal_waktu <= ?
    `, [startDateStr, endDateStr])

    if (mode === "harian") {
      const lastDay = new Date(year, month!, 0).getDate()
      const buckets = new Map<number, { kotor: number; bersih: number }>()
      for (let d = 1; d <= lastDay; d++) buckets.set(d, { kotor: 0, bersih: 0 })

      for (const row of rows) {
        const dateObj = utcSqlToDate(row.tanggal_waktu)
        const dayNum = parseInt(dateObj.toLocaleDateString("en-CA", { timeZone: BUSINESS_TIMEZONE }).split("-")[2], 10)
        const bucket = buckets.get(dayNum)
        if (bucket) {
          bucket.kotor += Number(row.tarif_total) || 0
          bucket.bersih += Number(row.tarif_jatah_pemilik) || 0
        }
      }

      const data: ChartPoint[] = Array.from(buckets.entries()).map(([day, val]) => ({
        label: String(day),
        pendapatanKotor: val.kotor,
        pendapatanBersih: val.bersih,
      }))
      return { data }
    } else if (mode === "bulanan") {
      const buckets = new Map<number, { kotor: number; bersih: number }>()
      for (let m = 1; m <= 12; m++) buckets.set(m, { kotor: 0, bersih: 0 })

      for (const row of rows) {
        const dateObj = utcSqlToDate(row.tanggal_waktu)
        const monthNum = parseInt(dateObj.toLocaleDateString("en-CA", { timeZone: BUSINESS_TIMEZONE }).split("-")[1], 10)
        const bucket = buckets.get(monthNum)
        if (bucket) {
          bucket.kotor += Number(row.tarif_total) || 0
          bucket.bersih += Number(row.tarif_jatah_pemilik) || 0
        }
      }

      const data: ChartPoint[] = Array.from(buckets.entries()).map(([m, val]) => ({
        label: BULAN_LABEL[m - 1],
        pendapatanKotor: val.kotor,
        pendapatanBersih: val.bersih,
      }))
      return { data }
    } else {
      const buckets = new Map<string, { label: string; kotor: number; bersih: number }>()
      let cursorYear = startYear!
      let cursorMonth = startMonth!
      while (cursorYear * 12 + cursorMonth <= endYear! * 12 + endMonth!) {
        const key = `${cursorYear}-${String(cursorMonth).padStart(2, "0")}`
        buckets.set(key, { label: `${BULAN_LABEL[cursorMonth - 1]} ${cursorYear}`, kotor: 0, bersih: 0 })
        cursorMonth += 1
        if (cursorMonth > 12) {
          cursorMonth = 1
          cursorYear += 1
        }
      }

      for (const row of rows) {
        const dateObj = utcSqlToDate(row.tanggal_waktu)
        const key = dateObj.toLocaleDateString("en-CA", { timeZone: BUSINESS_TIMEZONE }).slice(0, 7) 
        const bucket = buckets.get(key)
        if (bucket) {
          bucket.kotor += Number(row.tarif_total) || 0
          bucket.bersih += Number(row.tarif_jatah_pemilik) || 0
        }
      }

      const data: ChartPoint[] = Array.from(buckets.values()).map((b) => ({
        label: b.label,
        pendapatanKotor: b.kotor,
        pendapatanBersih: b.bersih,
      }))
      return { data }
    }
  } catch (error) {
    console.error("Fetch chart data error:", error)
    return { data: [], error: "Gagal memuat data grafik" }
  }
}