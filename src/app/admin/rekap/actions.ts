"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Anda harus login" as const }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return { error: "Hanya admin yang bisa mengubah/menghapus transaksi" as const }
  }

  return { error: null }
}

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
  kasir_nama: string | null // nama_lengkap kalau ada, fallback ke username
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
      "id, tanggal_waktu, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, jenis_kendaraan:jenis_kendaraan_id(kategori, ukuran), profiles:kasir_id(username, nama_lengkap)"
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
    profiles: { username: string; nama_lengkap: string | null } | null
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
    kasir_nama: row.profiles?.nama_lengkap || row.profiles?.username || null,
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

export async function updateTransaksi(params: {
  id: string
  jenisKendaraanId: string
  platNomor: string | null
}) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const supabase = await createClient()

  // Ambil tarif & split terbaru dari jenis_kendaraan yang dipilih (bisa saja
  // beda dari kategori transaksi sebelumnya kalau admin mengubah jenis
  // kendaraan lewat form edit)
  const { data: jenisKendaraan, error: jkError } = await supabase
    .from("jenis_kendaraan")
    .select("tarif_default, jatah_karyawan, jatah_pemilik")
    .eq("id", params.jenisKendaraanId)
    .single()

  if (jkError || !jenisKendaraan) {
    return { error: "Gagal mengambil data tarif kendaraan" }
  }

  const { error } = await supabase
    .from("transaksi")
    .update({
      jenis_kendaraan_id: params.jenisKendaraanId,
      plat_nomor: params.platNomor,
      tarif_total: jenisKendaraan.tarif_default,
      tarif_jatah_karyawan: jenisKendaraan.jatah_karyawan,
      tarif_jatah_pemilik: jenisKendaraan.jatah_pemilik,
    })
    .eq("id", params.id)

  if (error) {
    console.error("Update transaksi error:", error)
    return { error: "Gagal mengubah transaksi" }
  }

  revalidatePath("/admin/rekap")
  return { success: true }
}

export async function deleteTransaksi(id: string) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const supabase = await createClient()
  const { error } = await supabase.from("transaksi").delete().eq("id", id)

  if (error) {
    console.error("Delete transaksi error:", error)
    return { error: "Gagal menghapus transaksi" }
  }

  revalidatePath("/admin/rekap")
  return { success: true }
}

export async function fetchJenisKendaraanAktif() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("jenis_kendaraan")
    .select("id, kategori, ukuran")
    .eq("aktif", true)
    .order("kategori", { ascending: false })
    .order("ukuran", { ascending: true })

  if (error) return []
  return data || []
}