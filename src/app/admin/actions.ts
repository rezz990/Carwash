"use server"

import { createClient } from "@/utils/supabase/server"

const TIMEZONE = "Asia/Jakarta"

function getTanggalKeyJakarta(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString("en-CA", { timeZone: TIMEZONE })
}

// Tanggal hari ini di WIB, format YYYY-MM-DD - dipakai buat filter query
function getTodayJakarta(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE })
}

export type OverviewStats = {
  pendapatanHariIni: number
  transaksiHariIni: number
  pendapatanKemarin: number
  persenPerubahan: number | null // null kalau kemarin 0 (ga bisa dihitung persen)
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
  const supabase = await createClient()
  const todayStr = getTodayJakarta()

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: TIMEZONE })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6) // termasuk hari ini = 7 hari
  const sevenDaysAgoStr = sevenDaysAgo.toLocaleDateString("en-CA", { timeZone: TIMEZONE })

  // Fetch transaksi 7 hari terakhir sekaligus (dipakai buat hari ini,
  // kemarin, rata-rata, dan kategori terlaris - satu query, diproses di JS)
  const { data: rows, error } = await supabase
    .from("transaksi")
    .select("tanggal_waktu, tarif_total, jenis_kendaraan:jenis_kendaraan_id(kategori, ukuran)")
    .gte("tanggal_waktu", `${sevenDaysAgoStr}T00:00:00+07:00`)
    .lte("tanggal_waktu", `${todayStr}T23:59:59+07:00`)

  if (error) {
    console.error("Fetch overview stats error:", error)
    return {
      pendapatanHariIni: 0, transaksiHariIni: 0, pendapatanKemarin: 0,
      persenPerubahan: null, jumlahKasirAktif: 0, rataRataPendapatan7Hari: 0,
      kategoriTerlarisMingguIni: null, transaksiTerbaru: [],
      error: "Gagal memuat data overview",
    }
  }

  const typedRows = (rows as unknown as Array<{
    tanggal_waktu: string
    tarif_total: number
    jenis_kendaraan: { kategori: string; ukuran: string } | null
  }>) || []

  let pendapatanHariIni = 0
  let transaksiHariIni = 0
  let pendapatanKemarin = 0
  let totalPendapatan7Hari = 0
  const kategoriCount = new Map<string, number>()

  for (const row of typedRows) {
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
    if (row.jenis_kendaraan) {
      const label = `${row.jenis_kendaraan.kategori} ${row.jenis_kendaraan.ukuran}`
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

  // Kasir aktif
  const { count: jumlahKasirAktif } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "kasir")
    .eq("aktif", true)

  // 5 transaksi terbaru
  const { data: terbaru } = await supabase
    .from("transaksi")
    .select("id, tanggal_waktu, plat_nomor, tarif_total, jenis_kendaraan:jenis_kendaraan_id(kategori, ukuran)")
    .order("tanggal_waktu", { ascending: false })
    .limit(5)

  const transaksiTerbaru = ((terbaru as unknown as Array<{
    id: string
    tanggal_waktu: string
    plat_nomor: string | null
    tarif_total: number
    jenis_kendaraan: { kategori: string; ukuran: string } | null
  }>) || []).map((t) => ({
    id: t.id,
    tanggal_waktu: t.tanggal_waktu,
    kategori: t.jenis_kendaraan?.kategori || "-",
    ukuran: t.jenis_kendaraan?.ukuran || "-",
    plat_nomor: t.plat_nomor,
    tarif_total: Number(t.tarif_total) || 0,
  }))

  return {
    pendapatanHariIni,
    transaksiHariIni,
    pendapatanKemarin,
    persenPerubahan,
    jumlahKasirAktif: jumlahKasirAktif || 0,
    rataRataPendapatan7Hari: totalPendapatan7Hari / 7,
    kategoriTerlarisMingguIni,
    transaksiTerbaru,
  }
}

export type ChartPoint = {
  label: string
  pendapatanKotor: number
  pendapatanBersih: number
}

const BULAN_LABEL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

/**
 * Ambil data chart pendapatan.
 * mode "harian": tampilkan per hari dalam SATU bulan tertentu (year+month wajib)
 * mode "bulanan": tampilkan per bulan dalam SATU tahun tertentu (year wajib)
 * mode "rentang": tampilkan per bulan dari (startYear+startMonth) sampai
 *   (endYear+endMonth) bebas, bisa lintas tahun
 */
export async function fetchChartData(params: {
  mode: "harian" | "bulanan" | "rentang"
  year: number
  month?: number // 1-12, wajib kalau mode "harian"
  startYear?: number // wajib kalau mode "rentang"
  startMonth?: number // 1-12, wajib kalau mode "rentang"
  endYear?: number // wajib kalau mode "rentang"
  endMonth?: number // 1-12, wajib kalau mode "rentang"
}): Promise<{ data: ChartPoint[]; error?: string }> {
  const supabase = await createClient()
  const { mode, year, month, startYear, startMonth, endYear, endMonth } = params

  let startDate: string
  let endDate: string

  if (mode === "harian") {
    if (!month) return { data: [], error: "Bulan wajib diisi untuk mode harian" }
    const lastDay = new Date(year, month, 0).getDate() // hari terakhir bulan itu
    startDate = `${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`
    endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59+07:00`
  } else if (mode === "bulanan") {
    startDate = `${year}-01-01T00:00:00+07:00`
    endDate = `${year}-12-31T23:59:59+07:00`
  } else {
    // mode "rentang"
    if (!startYear || !startMonth || !endYear || !endMonth) {
      return { data: [], error: "Rentang bulan (dari & sampai) wajib diisi" }
    }
    // Validasi: "dari" tidak boleh setelah "sampai"
    const startIdx = startYear * 12 + startMonth
    const endIdx = endYear * 12 + endMonth
    if (startIdx > endIdx) {
      return { data: [], error: "Bulan 'Dari' tidak boleh setelah bulan 'Sampai'" }
    }
    const lastDayEnd = new Date(endYear, endMonth, 0).getDate()
    startDate = `${startYear}-${String(startMonth).padStart(2, "0")}-01T00:00:00+07:00`
    endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-${String(lastDayEnd).padStart(2, "0")}T23:59:59+07:00`
  }

  const { data: rows, error } = await supabase
    .from("transaksi")
    .select("tanggal_waktu, tarif_total, tarif_jatah_pemilik")
    .gte("tanggal_waktu", startDate)
    .lte("tanggal_waktu", endDate)

  if (error) {
    console.error("Fetch chart data error:", error)
    return { data: [], error: "Gagal memuat data grafik" }
  }

  const typedRows = (rows as unknown as Array<{
    tanggal_waktu: string
    tarif_total: number
    tarif_jatah_pemilik: number
  }>) || []

  if (mode === "harian") {
    const lastDay = new Date(year, month!, 0).getDate()
    const buckets = new Map<number, { kotor: number; bersih: number }>()
    for (let d = 1; d <= lastDay; d++) buckets.set(d, { kotor: 0, bersih: 0 })

    for (const row of typedRows) {
      const dateObj = new Date(row.tanggal_waktu)
      const dayNum = parseInt(
        dateObj.toLocaleDateString("en-CA", { timeZone: TIMEZONE }).split("-")[2],
        10
      )
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

    for (const row of typedRows) {
      const dateObj = new Date(row.tanggal_waktu)
      const monthNum = parseInt(
        dateObj.toLocaleDateString("en-CA", { timeZone: TIMEZONE }).split("-")[1],
        10
      )
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
    // mode "rentang" - buckets per bulan-tahun dari start sampai end
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

    for (const row of typedRows) {
      const dateObj = new Date(row.tanggal_waktu)
      const key = dateObj.toLocaleDateString("en-CA", { timeZone: TIMEZONE }).slice(0, 7) // YYYY-MM
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
}