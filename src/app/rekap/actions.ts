"use server"

import pool from "@/lib/db"
import type { RowDataPacket } from "mysql2"
import { jakartaDateToUtcSql, utcSqlToIso } from "@/lib/datetime"
import { requireLogin } from "@/lib/authz"

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
  const { error: authError } = await requireLogin()
  if (authError) return { data: [], totalCount: 0, totalPendapatan: 0, error: authError }

  const { page, dateFrom, dateTo, jenisKendaraanId } = params
  const from = (page - 1) * PAGE_SIZE

  let whereClauses: string[] = []
  let queryParams: any[] = []

  if (dateFrom) {
    whereClauses.push("t.tanggal_waktu >= ?")
    queryParams.push(jakartaDateToUtcSql(dateFrom))
  }

  if (dateTo) {
    whereClauses.push("t.tanggal_waktu <= ?")
    queryParams.push(jakartaDateToUtcSql(dateTo, true))
  }

  if (jenisKendaraanId) {
    whereClauses.push("t.jenis_kendaraan_id = ?")
    queryParams.push(jenisKendaraanId)
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""

  try {
    const dataQuery = `
      SELECT t.id, t.tanggal_waktu, t.plat_nomor, t.tarif_total, jk.kategori, jk.ukuran
      FROM transaksi t
      LEFT JOIN jenis_kendaraan jk ON t.jenis_kendaraan_id = jk.id
      ${whereSql}
      ORDER BY t.tanggal_waktu DESC
      LIMIT ? OFFSET ?
    `
    const [dataRows] = await pool.query<RowDataPacket[]>(dataQuery, [...queryParams, PAGE_SIZE, from])

    const countQuery = `
      SELECT COUNT(t.id) as count, SUM(t.tarif_total) as sum
      FROM transaksi t
      ${whereSql}
    `
    const [countRows] = await pool.query<RowDataPacket[]>(countQuery, queryParams)

    const data = dataRows.map((row) => ({
      id: row.id,
      tanggal_waktu: utcSqlToIso(row.tanggal_waktu),
      plat_nomor: row.plat_nomor,
      tarif_total: Number(row.tarif_total) || 0,
      jenis_kendaraan: {
        kategori: row.kategori || "-",
        ukuran: row.ukuran || "-",
      },
    }))

    return {
      data,
      totalCount: Number(countRows[0].count) || 0,
      totalPendapatan: Number(countRows[0].sum) || 0,
    }
  } catch (error) {
    console.error("Fetch transaksi error:", error)
    return { data: [], totalCount: 0, totalPendapatan: 0, error: "Gagal memuat data transaksi" }
  }
}

export async function fetchJenisKendaraanList() {
  const { error: authError } = await requireLogin()
  if (authError) return []

  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, kategori, ukuran
      FROM jenis_kendaraan
      ORDER BY kategori DESC, ukuran ASC
    `)
    return rows as { id: string; kategori: string; ukuran: string }[]
  } catch (error) {
    console.error("Fetch jenis kendaraan error:", error)
    return []
  }
}
