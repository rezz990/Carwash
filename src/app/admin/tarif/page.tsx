import pool from "@/lib/db"
import type { RowDataPacket } from "mysql2"
import { TarifTable, type JenisKendaraan } from "./TarifTable"

export default async function TarifPage() {
  let data: JenisKendaraan[] = []
  let loadError: string | undefined

  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT id, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik, aktif
      FROM jenis_kendaraan
      ORDER BY kategori ASC, ukuran ASC
    `)
    data = rows.map((row) => ({
      id: String(row.id), kategori: String(row.kategori), ukuran: String(row.ukuran),
      tarif_default: Number(row.tarif_default), jatah_karyawan: Number(row.jatah_karyawan),
      jatah_pemilik: Number(row.jatah_pemilik), aktif: Boolean(row.aktif),
    }))
  } catch (error) {
    console.error("Fetch jenis_kendaraan error:", error)
    loadError = "Daftar tarif gagal dimuat. Coba muat ulang halaman."
  }

  return <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
    <header><p className="text-sm font-medium text-slate-500">Layanan dan pembagian</p><h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Kelola tarif</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Atur harga dan bagian karyawan. Bagian pemilik dihitung otomatis agar jumlahnya selalu sama dengan tarif total.</p></header>
    <TarifTable data={data} loadError={loadError} />
  </div>
}
