"use server"

import { createClient } from "@/utils/supabase/server"

export type RekapHarian = {
  tanggal: string // YYYY-MM-DD
  hari: string // "Senin", "Selasa", dst
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
  kasir_username: string | null
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

const TIMEZONE = "Asia/Jakarta"

// PENTING: Supabase menyimpan tanggal_waktu dalam UTC. Kalau langsung
// slice(0, 10) dari string ISO mentah, transaksi yang terjadi dini hari WIB
// (misal jam 00:30 WIB = 17:30 UTC hari sebelumnya) bisa salah masuk ke
// tanggal yang keliru. Selalu convert ke Asia/Jakarta dulu sebelum
// menentukan tanggal/hari untuk pengelompokan.
function getTanggalKeyJakarta(isoString: string): string {
  const date = new Date(isoString)
  // locale "en-CA" menghasilkan format YYYY-MM-DD langsung
  return date.toLocaleDateString("en-CA", { timeZone: TIMEZONE })
}

function getHariJakarta(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString("id-ID", { timeZone: TIMEZONE, weekday: "long" })
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
  dateFrom: string // YYYY-MM-DD
  dateTo: string // YYYY-MM-DD
}): Promise<RekapResult> {
  const supabase = await createClient()
  const { dateFrom, dateTo } = params

  // Filter input dari <input type="date"> berupa tanggal lokal WIB, tapi
  // kalau dikirim tanpa offset, Postgres akan menganggapnya UTC (bukan WIB).
  // Tambahkan offset +07:00 eksplisit supaya "00:00:00" beneran berarti
  // tengah malam WIB, bukan tengah malam UTC (yang mundur 7 jam).
  const startDate = `${dateFrom}T00:00:00+07:00`
  const endDate = `${dateTo}T23:59:59+07:00`

  // Ambil semua transaksi dalam rentang tanggal sekaligus (bukan paginated),
  // karena kita perlu agregasi penuh. Untuk skala internal tool kecil ini
  // aman; kalau data sudah sangat besar (>puluhan ribu baris/bulan),
  // pertimbangkan agregasi lewat SQL function di database.
  const { data: transaksi, error } = await supabase
    .from("transaksi")
    .select(
      "id, tanggal_waktu, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, jenis_kendaraan:jenis_kendaraan_id(kategori, ukuran), profiles:kasir_id(username)"
    )
    .gte("tanggal_waktu", startDate)
    .lte("tanggal_waktu", endDate)
    .order("tanggal_waktu", { ascending: true })

  if (error) {
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

  const rows = (transaksi as unknown as Array<{
    id: string
    tanggal_waktu: string
    plat_nomor: string | null
    tarif_total: number
    tarif_jatah_karyawan: number
    tarif_jatah_pemilik: number
    jenis_kendaraan: { kategori: string; ukuran: string } | null
    profiles: { username: string } | null
  }>) || []

  // Agregasi per hari
  const harianMap = new Map<string, RekapHarian>()

  for (const row of rows) {
    const tanggalKey = getTanggalKeyJakarta(row.tanggal_waktu)

    if (!harianMap.has(tanggalKey)) {
      harianMap.set(tanggalKey, {
        tanggal: tanggalKey,
        hari: getHariJakarta(row.tanggal_waktu),
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

    if (row.jenis_kendaraan) {
      const key = getKategoriKey(row.jenis_kendaraan.kategori, row.jenis_kendaraan.ukuran)
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

  const detail: TransaksiDetail[] = rows.map((row) => ({
    id: row.id,
    tanggal_waktu: row.tanggal_waktu,
    plat_nomor: row.plat_nomor,
    tarif_total: Number(row.tarif_total) || 0,
    tarif_jatah_karyawan: Number(row.tarif_jatah_karyawan) || 0,
    tarif_jatah_pemilik: Number(row.tarif_jatah_pemilik) || 0,
    kategori: row.jenis_kendaraan?.kategori || "-",
    ukuran: row.jenis_kendaraan?.ukuran || "-",
    kasir_username: row.profiles?.username || null,
  })).reverse() // terbaru duluan untuk tampilan detail

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
}