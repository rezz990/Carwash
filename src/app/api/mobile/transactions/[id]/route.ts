import type { ResultSetHeader, RowDataPacket } from "mysql2";
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(request, ["kasir"]);
  if ("error" in auth) return auth.error;
  const connection = await pool.getConnection();
  try {
    const { id } = await params;
    const body = await request.json();
    const jenisKendaraanId = String(body?.jenisKendaraanId ?? "").trim();
    const platNomorRaw =
      body?.platNomor == null ? "" : String(body.platNomor).trim();
    if (!jenisKendaraanId) {
      return jsonError(400, "INVALID_INPUT", "jenisKendaraanId wajib diisi");
    }
    /* * Untuk transaksi tanpa plat, * Android menggunakan B0000XX. */ const platNomor =
      platNomorRaw === "" ? "B0000XX" : platNomorRaw.toUpperCase();
    await connection.beginTransaction();
    /* * Ambil transaksi yang akan diedit. */ const [transactionRows] =
      await connection.query<RowDataPacket[]>(
        `SELECT id, tanggal_waktu, jenis_kendaraan_id, plat_nomor, kasir_id FROM transaksi WHERE id = ? LIMIT 1 FOR UPDATE`,
        [id],
      );
    const transaction = transactionRows[0];
    if (!transaction) {
      await connection.rollback();
      return jsonError(404, "NOT_FOUND", "Transaksi tidak ditemukan");
    }
    /* * Pastikan transaksi memang milik kasir * yang sedang login. */ if (
      String(transaction.kasir_id) !== String(auth.user.id)
    ) {
      await connection.rollback();
      return jsonError(
        403,
        "FORBIDDEN",
        "Anda tidak memiliki akses untuk mengubah transaksi ini",
      );
    }
    /* * Ambil konfigurasi tarif terbaru dari DB. */ const [vehicleRows] =
      await connection.query<RowDataPacket[]>(
        `SELECT id, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik FROM jenis_kendaraan WHERE id = ? AND aktif = 1 LIMIT 1`,
        [jenisKendaraanId],
      );
    const vehicle = vehicleRows[0];
    if (!vehicle) {
      await connection.rollback();
      return jsonError(
        404,
        "VEHICLE_NOT_FOUND",
        "Jenis kendaraan tidak ditemukan atau tidak aktif",
      );
    }
    const tarif = Number(vehicle.tarif_default);
    const jatahKaryawan = Number(vehicle.jatah_karyawan);
    const jatahPemilik = Number(vehicle.jatah_pemilik);
    if (
      !Number.isFinite(tarif) ||
      !Number.isFinite(jatahKaryawan) ||
      !Number.isFinite(jatahPemilik)
    ) {
      await connection.rollback();
      return jsonError(
        409,
        "INVALID_TARIFF",
        "Konfigurasi tarif kendaraan tidak valid",
      );
    }
    /* * Update transaksi. * * edited_at otomatis diisi waktu UTC * ketika transaksi berhasil diedit. */ await connection.query<ResultSetHeader>(
      `UPDATE transaksi SET jenis_kendaraan_id = ?, plat_nomor = ?, tarif_total = ?, tarif_jatah_karyawan = ?, tarif_jatah_pemilik = ?, edited_at = UTC_TIMESTAMP() WHERE id = ?`,
      [jenisKendaraanId, platNomor, tarif, jatahKaryawan, jatahPemilik, id],
    );
    await connection.commit();
    /* * Ambil kembali data terbaru setelah UPDATE. */ const [updatedRows] =
      await pool.query<RowDataPacket[]>(
        `SELECT t.id, t.tanggal_waktu, t.plat_nomor, t.tarif_total, t.tarif_jatah_karyawan, t.tarif_jatah_pemilik, t.edited_at, jk.id AS jenis_id, jk.kategori, jk.ukuran, u.id AS kasir_id, u.username AS kasir_username, u.nama_lengkap AS kasir_nama FROM transaksi t JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id JOIN users u ON u.id = t.kasir_id WHERE t.id = ? LIMIT 1`,
        [id],
      );
    const r = updatedRows[0];
    if (!r) {
      return jsonError(
        500,
        "INTERNAL_ERROR",
        "Transaksi berhasil diperbarui tetapi data terbaru tidak ditemukan",
      );
    }
    return jsonOk({
      transaction: {
        id: String(r.id),
        tanggalWaktu: utcSqlToIso(String(r.tanggal_waktu)),
        platNomor: r.plat_nomor,
        tarif: Number(r.tarif_total),
        jatahKaryawan: Number(r.tarif_jatah_karyawan),
        jatahPemilik: Number(r.tarif_jatah_pemilik),
        editedAt: r.edited_at ? utcSqlToIso(String(r.edited_at)) : null,
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
    try {
      await connection.rollback();
    } catch {}
    console.error("PATCH /api/mobile/transactions/[id] error:", error);
    return jsonError(500, "INTERNAL_ERROR", "Gagal memperbarui transaksi");
  } finally {
    connection.release();
  }
}
