"use server"

import pool from "@/lib/db"
import { requireAdmin } from "@/lib/authz"
import type { RowDataPacket } from "mysql2"
import { addJakartaDays, jakartaDateToUtcSql, todayJakarta, utcSqlToIso } from "@/lib/datetime"

export type OverviewStats = {
  pendapatanHariIni: number
  bagianPemilikHariIni: number
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
  if (authError) return { pendapatanHariIni: 0, bagianPemilikHariIni: 0, transaksiHariIni: 0, pendapatanKemarin: 0, persenPerubahan: null, jumlahKasirAktif: 0, rataRataPendapatan7Hari: 0, kategoriTerlarisMingguIni: null, transaksiTerbaru: [], error: authError }
  const todayStr = todayJakarta()

  const yesterdayStr = addJakartaDays(todayStr, -1)
  const sevenDaysAgoStr = addJakartaDays(todayStr, -6)

  try {
    const rangeStart = jakartaDateToUtcSql(sevenDaysAgoStr)
    const rangeEnd = jakartaDateToUtcSql(todayStr, true)
    const todayStart = jakartaDateToUtcSql(todayStr)
    const yesterdayStart = jakartaDateToUtcSql(yesterdayStr)

    const [[summaryRows], [kategoriRows], [kasirRows], [terbaruRows]] = await Promise.all([
      pool.query<RowDataPacket[]>(`
        SELECT
          COALESCE(SUM(CASE WHEN tanggal_waktu >= ? THEN tarif_total ELSE 0 END), 0) AS pendapatan_hari_ini,
          COALESCE(SUM(CASE WHEN tanggal_waktu >= ? THEN tarif_jatah_pemilik ELSE 0 END), 0) AS bagian_pemilik_hari_ini,
          SUM(CASE WHEN tanggal_waktu >= ? THEN 1 ELSE 0 END) AS transaksi_hari_ini,
          COALESCE(SUM(CASE WHEN tanggal_waktu >= ? AND tanggal_waktu < ? THEN tarif_total ELSE 0 END), 0) AS pendapatan_kemarin,
          COALESCE(SUM(tarif_total), 0) AS pendapatan_7_hari
        FROM transaksi
        WHERE tanggal_waktu >= ? AND tanggal_waktu <= ?
      `, [todayStart, todayStart, todayStart, yesterdayStart, todayStart, rangeStart, rangeEnd]),
      pool.query<RowDataPacket[]>(`
        SELECT CONCAT(jk.kategori, ' ', jk.ukuran) AS label, COUNT(*) AS jumlah
        FROM transaksi t
        JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id
        WHERE t.tanggal_waktu >= ? AND t.tanggal_waktu <= ?
        GROUP BY t.jenis_kendaraan_id, jk.kategori, jk.ukuran
        ORDER BY jumlah DESC, label ASC
        LIMIT 1
      `, [rangeStart, rangeEnd]),
      pool.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM users WHERE role = 'kasir' AND aktif = 1"),
      pool.query<RowDataPacket[]>(`
        SELECT t.id, t.tanggal_waktu, t.plat_nomor, t.tarif_total, jk.kategori, jk.ukuran
        FROM transaksi t
        LEFT JOIN jenis_kendaraan jk ON t.jenis_kendaraan_id = jk.id
        ORDER BY t.tanggal_waktu DESC
        LIMIT 5
      `),
    ])

    const summary = summaryRows[0] ?? {}
    const pendapatanHariIni = Number(summary.pendapatan_hari_ini) || 0
    const bagianPemilikHariIni = Number(summary.bagian_pemilik_hari_ini) || 0
    const transaksiHariIni = Number(summary.transaksi_hari_ini) || 0
    const pendapatanKemarin = Number(summary.pendapatan_kemarin) || 0
    const totalPendapatan7Hari = Number(summary.pendapatan_7_hari) || 0
    const kategoriTerlarisMingguIni = kategoriRows[0]?.label ? String(kategoriRows[0].label) : null

    const persenPerubahan =
      pendapatanKemarin > 0
        ? ((pendapatanHariIni - pendapatanKemarin) / pendapatanKemarin) * 100
        : null

    const jumlahKasirAktif = kasirRows[0].count

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
      bagianPemilikHariIni,
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
      pendapatanHariIni: 0, bagianPemilikHariIni: 0, transaksiHariIni: 0, pendapatanKemarin: 0,
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
    const bucketExpression = mode === "harian"
      ? "DAY(DATE_ADD(tanggal_waktu, INTERVAL 7 HOUR))"
      : mode === "bulanan"
        ? "MONTH(DATE_ADD(tanggal_waktu, INTERVAL 7 HOUR))"
        : "DATE_FORMAT(DATE_ADD(tanggal_waktu, INTERVAL 7 HOUR), '%Y-%m')"
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT ${bucketExpression} AS bucket_key,
             COALESCE(SUM(tarif_total), 0) AS pendapatan_kotor,
             COALESCE(SUM(tarif_jatah_pemilik), 0) AS pendapatan_bersih
      FROM transaksi
      WHERE tanggal_waktu >= ? AND tanggal_waktu <= ?
      GROUP BY bucket_key
      ORDER BY bucket_key ASC
    `, [startDateStr, endDateStr])

    if (mode === "harian") {
      const lastDay = new Date(year, month!, 0).getDate()
      const buckets = new Map<number, { kotor: number; bersih: number }>()
      for (let d = 1; d <= lastDay; d++) buckets.set(d, { kotor: 0, bersih: 0 })

      for (const row of rows) {
        const dayNum = Number(row.bucket_key)
        const bucket = buckets.get(dayNum)
        if (bucket) {
          bucket.kotor = Number(row.pendapatan_kotor) || 0
          bucket.bersih = Number(row.pendapatan_bersih) || 0
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
        const monthNum = Number(row.bucket_key)
        const bucket = buckets.get(monthNum)
        if (bucket) {
          bucket.kotor = Number(row.pendapatan_kotor) || 0
          bucket.bersih = Number(row.pendapatan_bersih) || 0
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
        const key = String(row.bucket_key)
        const bucket = buckets.get(key)
        if (bucket) {
          bucket.kotor = Number(row.pendapatan_kotor) || 0
          bucket.bersih = Number(row.pendapatan_bersih) || 0
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
