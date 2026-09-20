import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise"

export const MAX_BACKUP_ROWS = 50_000
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024
export type BackupRow = {
  id: string
  tanggal_waktu: string
  jenis_kendaraan_id: string
  plat_nomor: string | null
  tarif_total: number
  tarif_jatah_karyawan: number
  tarif_jatah_pemilik: number
  kasir_id: string
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const money = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
  && value >= 0 && value <= 9_999_999_999.99 && Math.abs(value * 100 - Math.round(value * 100)) < 0.001

export function validateTransactionBackup(input: unknown): BackupRow[] {
  if (!Array.isArray(input) || !input.length || input.length > MAX_BACKUP_ROWS) {
    throw new Error(`Backup harus berisi 1–${MAX_BACKUP_ROWS.toLocaleString("id-ID")} transaksi.`)
  }
  return input.map((value: unknown, index) => {
    if (!value || typeof value !== "object") throw new Error(`Baris ${index + 1} tidak valid.`)
    const row = value as Record<string, unknown>
    for (const field of ["id", "jenis_kendaraan_id", "kasir_id"]) {
      if (typeof row[field] !== "string" || !uuid.test(row[field])) throw new Error(`ID pada baris ${index + 1} tidak valid. Gunakan backup asli yang menyertakan ID transaksi.`)
    }
    if (typeof row.tanggal_waktu !== "string" || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(row.tanggal_waktu)
      || !Number.isFinite(Date.parse(row.tanggal_waktu))) throw new Error(`Waktu pada baris ${index + 1} tidak valid atau tidak menyertakan zona waktu.`)
    if (![row.tarif_total, row.tarif_jatah_karyawan, row.tarif_jatah_pemilik].every(money)) throw new Error(`Nominal pada baris ${index + 1} tidak valid.`)
    if (Math.round(Number(row.tarif_total) * 100) !== Math.round(Number(row.tarif_jatah_karyawan) * 100) + Math.round(Number(row.tarif_jatah_pemilik) * 100)) {
      throw new Error(`Pembagian pendapatan pada baris ${index + 1} tidak sama dengan total.`)
    }
    if (row.plat_nomor !== null && (typeof row.plat_nomor !== "string" || row.plat_nomor.length > 50)) throw new Error(`Plat pada baris ${index + 1} tidak valid.`)
    return {
      id: String(row.id).toLowerCase(), jenis_kendaraan_id: String(row.jenis_kendaraan_id).toLowerCase(), kasir_id: String(row.kasir_id).toLowerCase(),
      tanggal_waktu: new Date(row.tanggal_waktu).toISOString(), plat_nomor: row.plat_nomor as string | null,
      tarif_total: Number(row.tarif_total), tarif_jatah_karyawan: Number(row.tarif_jatah_karyawan), tarif_jatah_pemilik: Number(row.tarif_jatah_pemilik),
    }
  })
}

/** All batches commit together. Existing IDs are skipped, other errors roll back. */
export async function insertBackupRows(connection: PoolConnection, rows: BackupRow[]) {
  const unique = new Map<string, BackupRow>()
  for (const row of rows) {
    const previous = unique.get(row.id)
    if (previous && JSON.stringify(previous) !== JSON.stringify(row)) throw new Error("Satu ID transaksi memiliki dua isi berbeda di dalam backup.")
    unique.set(row.id, row)
  }
  let inserted = 0
  const data = [...unique.values()]
  await connection.beginTransaction()
  try {
    for (let i = 0; i < data.length; i += 500) {
      const chunk = data.slice(i, i + 500)
      const [existing] = await connection.query<RowDataPacket[]>(`SELECT id FROM transaksi WHERE id IN (${chunk.map(() => "?").join(",")}) FOR UPDATE`, chunk.map(row => row.id))
      const existingIds = new Set(existing.map(row => String(row.id).toLowerCase()))
      const fresh = chunk.filter(row => !existingIds.has(row.id))
      if (!fresh.length) continue
      const [result] = await connection.query<ResultSetHeader>(
        "INSERT INTO transaksi (id, tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id) VALUES ?",
        [fresh.map(row => [row.id, row.tanggal_waktu.slice(0, 19).replace("T", " "), row.jenis_kendaraan_id, row.plat_nomor, row.tarif_total, row.tarif_jatah_karyawan, row.tarif_jatah_pemilik, row.kasir_id])],
      )
      inserted += result.affectedRows
    }
    await connection.commit()
    return { inserted, skipped: rows.length - inserted }
  } catch (error) {
    await connection.rollback()
    throw error
  }
}
