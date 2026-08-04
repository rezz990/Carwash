"use server"

import { createClient } from "@/utils/supabase/server"

export type TransaksiRow = {
  id: string
  tanggal_waktu: string
  plat_nomor: string | null
  tarif_total: number
  jenis_kendaraan: {
    kategori: string
    ukuran: string
  }
}

export type FetchTransaksiResult = {
  data: TransaksiRow[]
  totalCount: number
  totalPendapatan: number
  error?: string
}

const PAGE_SIZE = 20

export async function fetchTransaksi(params: {
  page: number
  dateFrom?: string
  dateTo?: string
  jenisKendaraanId?: string
}): Promise<FetchTransaksiResult> {
  const supabase = await createClient()

  const { page, dateFrom, dateTo, jenisKendaraanId } = params
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Build query untuk data (paginated)
  let query = supabase
    .from("transaksi")
    .select("id, tanggal_waktu, plat_nomor, tarif_total, jenis_kendaraan:jenis_kendaraan_id(kategori, ukuran)", { count: "exact" })
    .order("tanggal_waktu", { ascending: false })
    .range(from, to)

  // Build query terpisah untuk sum total pendapatan (tanpa pagination)
  let sumQuery = supabase
    .from("transaksi")
    .select("tarif_total")

  // Apply filters ke kedua query
  if (dateFrom) {
    const startDate = `${dateFrom}T00:00:00`
    query = query.gte("tanggal_waktu", startDate)
    sumQuery = sumQuery.gte("tanggal_waktu", startDate)
  }

  if (dateTo) {
    const endDate = `${dateTo}T23:59:59`
    query = query.lte("tanggal_waktu", endDate)
    sumQuery = sumQuery.lte("tanggal_waktu", endDate)
  }

  if (jenisKendaraanId) {
    query = query.eq("jenis_kendaraan_id", jenisKendaraanId)
    sumQuery = sumQuery.eq("jenis_kendaraan_id", jenisKendaraanId)
  }

  const [dataResult, sumResult] = await Promise.all([query, sumQuery])

  if (dataResult.error) {
    console.error("Fetch transaksi error:", dataResult.error)
    return { data: [], totalCount: 0, totalPendapatan: 0, error: "Gagal memuat data transaksi" }
  }

  // Hitung sum pendapatan dari semua row yang match filter
  let totalPendapatan = 0
  if (!sumResult.error && sumResult.data) {
    totalPendapatan = sumResult.data.reduce((acc, row) => acc + (Number(row.tarif_total) || 0), 0)
  }

  return {
    data: (dataResult.data as unknown as TransaksiRow[]) || [],
    totalCount: dataResult.count || 0,
    totalPendapatan,
  }
}

export async function fetchJenisKendaraanList() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("jenis_kendaraan")
    .select("id, kategori, ukuran")
    .order("kategori", { ascending: false })
    .order("ukuran", { ascending: true })

  if (error) {
    console.error("Fetch jenis kendaraan error:", error)
    return []
  }

  return data || []
}
