import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { jakartaDateToUtcSql, nowUtcSql, utcSqlToIso } from "@/lib/datetime";
import {
  jsonError,
  jsonOk,
  normalizePlate,
  isValidPlate,
  requireMobileAuth,
} from "@/lib/mobile/http";

function parseDate(value: unknown) {
  if (!value) return new Date();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}
function nextJakartaDayUtc(date: string) {
  const d = new Date(`${date}T00:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export async function POST(request: Request) {
  const auth = await requireMobileAuth(request, ["kasir"]);
  if ("error" in auth) return auth.error;
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const jenisKendaraanId = String(body?.jenisKendaraanId ?? "").trim();
    const plate = normalizePlate(body?.platNomor);
    const requestedDate = parseDate(body?.tanggalWaktu);
    if (!jenisKendaraanId)
      return jsonError(400, "INVALID_INPUT", "Jenis kendaraan wajib dipilih");
    if (!plate || !isValidPlate(plate))
      return jsonError(400, "INVALID_PLATE", "Format plat nomor tidak valid");
    if (!requestedDate)
      return jsonError(
        400,
        "INVALID_DATE",
        "Format tanggal transaksi tidak valid",
      );
    await connection.beginTransaction();
    const [vehicleRows] = await connection.query<RowDataPacket[]>(
      "SELECT id, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik FROM jenis_kendaraan WHERE id = ? AND aktif = 1 LIMIT 1",
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
    const [duplicateRows] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM transaksi WHERE REPLACE(UPPER(plat_nomor), ' ', '') = ? AND tanggal_waktu >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 MINUTE) ORDER BY tanggal_waktu DESC LIMIT 1",
      [plate],
    );
    if (duplicateRows.length) {
      await connection.rollback();
      return jsonError(
        409,
        "DUPLICATE_PLATE",
        "Plat nomor ini baru saja memiliki transaksi",
        { transactionId: String(duplicateRows[0].id) },
      );
    }
    const tarif = Number(vehicle.tarif_default);
    const jatahKaryawan = Number(vehicle.jatah_karyawan);
    const jatahPemilik = Number(vehicle.jatah_pemilik);
    if (jatahKaryawan + jatahPemilik !== tarif) {
      await connection.rollback();
      return jsonError(
        409,
        "INVALID_TARIFF_CONFIG",
        "Konfigurasi tarif kendaraan tidak valid",
      );
    }
    const id = randomUUID();
    const sqlDate = body?.tanggalWaktu
      ? requestedDate.toISOString().slice(0, 19).replace("T", " ")
      : nowUtcSql();
    await connection.query<ResultSetHeader>(
      "INSERT INTO transaksi (id, tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        sqlDate,
        vehicle.id,
        plate,
        tarif,
        jatahKaryawan,
        jatahPemilik,
        auth.user.id,
      ],
    );
    await connection.commit();
    return jsonOk(
      {
        transaction: {
          id,
          tanggalWaktu: body?.tanggalWaktu
            ? requestedDate.toISOString()
            : new Date().toISOString(),
          platNomor: plate,
          jenisKendaraan: {
            id: String(vehicle.id),
            kategori: String(vehicle.kategori),
            ukuran: String(vehicle.ukuran),
          },
          tarif,
          jatahKaryawan,
          jatahPemilik,
          kasir: { id: auth.user.id, username: auth.user.username },
        },
      },
      201,
    );
  } catch (error) {
    await connection.rollback();
    console.error(error);
    return jsonError(500, "INTERNAL_ERROR", "Gagal menyimpan transaksi");
  } finally {
    connection.release();
  }
}

export async function GET(request: Request) {
  const auth = await requireMobileAuth(request, ["kasir"]);
  if ("error" in auth) return auth.error;
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(
      50,
      Math.max(1, Number(url.searchParams.get("limit") || 20)),
    );
    const offset = (page - 1) * limit;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const search = normalizePlate(url.searchParams.get("search"));
    const vehicleId = url.searchParams.get("jenisKendaraanId");
    const where: string[] = [];
    const params: unknown[] = [];
    if (from) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from))
        return jsonError(
          400,
          "INVALID_DATE",
          "Parameter from harus YYYY-MM-DD",
        );
      where.push("t.tanggal_waktu >= ?");
      params.push(jakartaDateToUtcSql(from));
    }
    if (to) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(to))
        return jsonError(400, "INVALID_DATE", "Parameter to harus YYYY-MM-DD");
      where.push("t.tanggal_waktu < ?");
      params.push(nextJakartaDayUtc(to));
    }
    if (search) {
      where.push("REPLACE(UPPER(t.plat_nomor), ' ', '') LIKE ?");
      params.push(`%${search}%`);
    }
    if (vehicleId) {
      where.push("t.jenis_kendaraan_id = ?");
      params.push(vehicleId);
    }
    const whereSql = where.join(" AND ");
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.id, t.tanggal_waktu, t.plat_nomor, t.tarif_total, t.tarif_jatah_karyawan, t.tarif_jatah_pemilik, jk.id AS jenis_id, jk.kategori, jk.ukuran FROM transaksi t JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id WHERE ${whereSql} ORDER BY t.tanggal_waktu DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [summary] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS count, COALESCE(SUM(t.tarif_total),0) AS omzet, COALESCE(SUM(t.tarif_jatah_karyawan),0) AS jatahKaryawan, COALESCE(SUM(t.tarif_jatah_pemilik),0) AS jatahPemilik FROM transaksi t WHERE ${whereSql}`,
      params,
    );
    const total = Number(summary[0].count);
    return jsonOk({
      data: rows.map((r) => ({
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
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: {
        omzet: Number(summary[0].omzet),
        jatahKaryawan: Number(summary[0].jatahKaryawan),
        jatahPemilik: Number(summary[0].jatahPemilik),
      },
    });
  } catch (error) {
    console.error(error);
    return jsonError(500, "INTERNAL_ERROR", "Gagal memuat transaksi");
  }
}
