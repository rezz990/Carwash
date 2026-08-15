import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { utcSqlToIso } from "@/lib/datetime";
import { jsonError, jsonOk, requireMobileAuth } from "@/lib/mobile/http";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(request, ["kasir"]);
  if ("error" in auth) return auth.error;
  try {
    const { id } = await params;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
    t.id,
    t.tanggal_waktu,
    t.plat_nomor,
    t.tarif_total,
    t.tarif_jatah_karyawan,
    t.tarif_jatah_pemilik,
    jk.id AS jenis_id,
    jk.kategori,
    jk.ukuran,
    u.id AS kasir_id,
    u.username AS kasir_username,
    u.nama_lengkap AS kasir_nama
  FROM transaksi t
  JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id
  JOIN users u ON u.id = t.kasir_id
  WHERE t.id = ?
  LIMIT 1`,
      [id],
    );
    const r = rows[0];
    if (!r) return jsonError(404, "NOT_FOUND", "Transaksi tidak ditemukan");
    return jsonOk({
      transaction: {
        id: String(r.id),
        tanggalWaktu: utcSqlToIso(String(r.tanggal_waktu)),
        platNomor: r.plat_nomor,
        tarif: Number(r.tarif_total),
        jatahKaryawan: Number(r.tarif_jatah_karyawan),
        jatahPemilik: Number(r.tarif_jatah_pemilik),
        jenisKendaraan: {
          id: String(r.jenis_id),
          kategori: String(r.kategori),
          ukuran: String(r.ukuran),
        },
        kasir: {
          id: String(r.kasir_id),
          username: String(r.kasir_username),
          namaLengkap: r.kasir_nama ?? null,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return jsonError(500, "INTERNAL_ERROR", "Gagal memuat transaksi");
  }
}
