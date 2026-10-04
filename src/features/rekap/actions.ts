"use server";

import { revalidatePath } from "next/cache";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/authz";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import {
  BUSINESS_TIMEZONE,
  jakartaDateToUtcSql,
  utcSqlToDate,
  utcSqlToIso,
} from "@/lib/datetime";
import { logActivity, toActivityActor } from "@/lib/activityLog";
import { isUuid } from "@/lib/ids";

export type RekapHarian = {
  tanggal: string;
  hari: string;
  motorKecil: number;
  motorBesar: number;
  mobilKecil: number;
  mobilSedang: number;
  mobilBesar: number;
  totalMotor: number;
  totalMobil: number;
  pendapatanKotor: number;
  bagianKaryawan: number;
  pendapatanBersih: number;
};

export type TransaksiDetail = {
  id: string;
  jenis_kendaraan_id: string;
  tanggal_waktu: string;
  edited_at: string | null;
  plat_nomor: string | null;
  tarif_total: number;
  tarif_jatah_karyawan: number;
  tarif_jatah_pemilik: number;
  kategori: string;
  ukuran: string;
  kasir_nama: string | null;
};

export type RekapResult = {
  harian: RekapHarian[];
  totalPendapatanKotor: number;
  totalBagianKaryawan: number;
  totalPendapatanBersih: number;
  totalTransaksi: number;
  rataRataPerHari: number;
  error?: string;
};

export type TransactionDateGroup = {
  tanggalKey: string;
  totalTransaksi: number;
  pendapatanKotor: number;
  bagianKaryawan: number;
  pendapatanBersih: number;
};

export type PaginatedTransactionGroups = {
  data: TransactionDateGroup[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
};

export type PaginatedDailyTransactions = {
  data: TransaksiDetail[];
  total: number;
  page: number;
  pageSize: number;
  totalPendapatanKotor: number;
  totalBagianKaryawan: number;
  totalPendapatanBersih: number;
  error?: string;
};

const DETAIL_PAGE_SIZE = 50;

function getHariJakarta(dateString: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "long",
  }).format(utcSqlToDate(dateString));
}

export async function fetchRekap(params: {
  dateFrom: string;
  dateTo: string;
}): Promise<RekapResult> {
  const { error: authError } = await requireAdmin();
  if (authError) {
    return {
      harian: [],
      totalPendapatanKotor: 0,
      totalBagianKaryawan: 0,
      totalPendapatanBersih: 0,
      totalTransaksi: 0,
      rataRataPerHari: 0,
      error: authError,
    };
  }

  const { dateFrom, dateTo } = params;

  const startDate = jakartaDateToUtcSql(dateFrom);
  const endDate = jakartaDateToUtcSql(dateTo, true);

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT DATE(DATE_ADD(t.tanggal_waktu, INTERVAL 7 HOUR)) AS tanggal,
             SUM(CASE WHEN LOWER(jk.kategori) = 'motor' AND LOWER(jk.ukuran) = 'kecil' THEN 1 ELSE 0 END) AS motor_kecil,
             SUM(CASE WHEN LOWER(jk.kategori) = 'motor' AND LOWER(jk.ukuran) = 'besar' THEN 1 ELSE 0 END) AS motor_besar,
             SUM(CASE WHEN LOWER(jk.kategori) = 'mobil' AND LOWER(jk.ukuran) = 'kecil' THEN 1 ELSE 0 END) AS mobil_kecil,
             SUM(CASE WHEN LOWER(jk.kategori) = 'mobil' AND LOWER(jk.ukuran) = 'sedang' THEN 1 ELSE 0 END) AS mobil_sedang,
             SUM(CASE WHEN LOWER(jk.kategori) = 'mobil' AND LOWER(jk.ukuran) = 'besar' THEN 1 ELSE 0 END) AS mobil_besar,
             SUM(CASE WHEN LOWER(jk.kategori) = 'motor' THEN 1 ELSE 0 END) AS total_motor,
             SUM(CASE WHEN LOWER(jk.kategori) = 'mobil' THEN 1 ELSE 0 END) AS total_mobil,
             COUNT(*) AS total_transaksi,
             COALESCE(SUM(t.tarif_total), 0) AS pendapatan_kotor,
             COALESCE(SUM(t.tarif_jatah_karyawan), 0) AS bagian_karyawan,
             COALESCE(SUM(t.tarif_jatah_pemilik), 0) AS pendapatan_bersih
      FROM transaksi t
      LEFT JOIN jenis_kendaraan jk ON t.jenis_kendaraan_id = jk.id
      WHERE t.tanggal_waktu >= ? AND t.tanggal_waktu <= ?
      GROUP BY tanggal
      ORDER BY tanggal ASC
    `,
      [startDate, endDate],
    );

    const harian: RekapHarian[] = rows.map((row) => {
      const tanggal = String(row.tanggal);
      return {
        tanggal,
        hari: getHariJakarta(`${tanggal} 00:00:00`),
        motorKecil: Number(row.motor_kecil), motorBesar: Number(row.motor_besar),
        mobilKecil: Number(row.mobil_kecil), mobilSedang: Number(row.mobil_sedang), mobilBesar: Number(row.mobil_besar),
        totalMotor: Number(row.total_motor), totalMobil: Number(row.total_mobil),
        pendapatanKotor: Number(row.pendapatan_kotor), bagianKaryawan: Number(row.bagian_karyawan),
        pendapatanBersih: Number(row.pendapatan_bersih),
      };
    });

    const totalPendapatanKotor = harian.reduce(
      (acc, h) => acc + h.pendapatanKotor,
      0,
    );
    const totalBagianKaryawan = harian.reduce(
      (acc, h) => acc + h.bagianKaryawan,
      0,
    );
    const totalPendapatanBersih = harian.reduce(
      (acc, h) => acc + h.pendapatanBersih,
      0,
    );
    const totalTransaksi = rows.reduce((sum, row) => sum + Number(row.total_transaksi), 0);
    const rataRataPerHari =
      harian.length > 0 ? totalPendapatanKotor / harian.length : 0;

    return {
      harian,
      totalPendapatanKotor,
      totalBagianKaryawan,
      totalPendapatanBersih,
      totalTransaksi,
      rataRataPerHari,
    };
  } catch (error) {
    console.error("Fetch rekap error:", error);
    return {
      harian: [],
      totalPendapatanKotor: 0,
      totalBagianKaryawan: 0,
      totalPendapatanBersih: 0,
      totalTransaksi: 0,
      rataRataPerHari: 0,
      error: "Gagal memuat data rekap",
    };
  }
}

export async function fetchTransactionDateGroups(params: {
  dateFrom: string;
  dateTo: string;
  page?: number;
  search?: string;
}): Promise<PaginatedTransactionGroups> {
  const { error } = await requireAdmin();
  const page = Number.isSafeInteger(params.page) ? Math.max(1, params.page ?? 1) : 1;
  if (error) return { data: [], total: 0, page, pageSize: DETAIL_PAGE_SIZE, error };

  const startDate = jakartaDateToUtcSql(params.dateFrom);
  const endDate = jakartaDateToUtcSql(params.dateTo, true);
  const search = params.search?.trim().slice(0, 100) ?? "";
  const searchSql = search
    ? `AND (t.plat_nomor LIKE ? OR u.username LIKE ? OR u.nama_lengkap LIKE ?
         OR CONCAT(jk.kategori, ' ', jk.ukuran) LIKE ?
         OR DATE_FORMAT(DATE_ADD(t.tanggal_waktu, INTERVAL 7 HOUR), '%Y-%m-%d') LIKE ?)`
    : "";
  const queryParams: unknown[] = [startDate, endDate];
  if (search) {
    const like = `%${search}%`;
    queryParams.push(like, like, like, like, like);
  }
  const offset = (page - 1) * DETAIL_PAGE_SIZE;

  try {
    const [[rows], [countRows]] = await Promise.all([
      pool.query<RowDataPacket[]>(`
        SELECT DATE(DATE_ADD(t.tanggal_waktu, INTERVAL 7 HOUR)) AS tanggal,
               COUNT(*) AS total_transaksi,
               COALESCE(SUM(t.tarif_total), 0) AS pendapatan_kotor,
               COALESCE(SUM(t.tarif_jatah_karyawan), 0) AS bagian_karyawan,
               COALESCE(SUM(t.tarif_jatah_pemilik), 0) AS pendapatan_bersih
        FROM transaksi t
        LEFT JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id
        LEFT JOIN users u ON u.id = t.kasir_id
        WHERE t.tanggal_waktu >= ? AND t.tanggal_waktu <= ? ${searchSql}
        GROUP BY tanggal
        ORDER BY tanggal DESC
        LIMIT ? OFFSET ?`,
        [...queryParams, DETAIL_PAGE_SIZE, offset]
      ),
      pool.query<RowDataPacket[]>(`
        SELECT COUNT(DISTINCT DATE(DATE_ADD(t.tanggal_waktu, INTERVAL 7 HOUR))) AS total
        FROM transaksi t
        LEFT JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id
        LEFT JOIN users u ON u.id = t.kasir_id
        WHERE t.tanggal_waktu >= ? AND t.tanggal_waktu <= ? ${searchSql}`,
        queryParams
      ),
    ]);
    return {
      data: rows.map((row) => ({
        tanggalKey: String(row.tanggal), totalTransaksi: Number(row.total_transaksi),
        pendapatanKotor: Number(row.pendapatan_kotor), bagianKaryawan: Number(row.bagian_karyawan),
        pendapatanBersih: Number(row.pendapatan_bersih),
      })),
      total: Number(countRows[0]?.total ?? 0), page, pageSize: DETAIL_PAGE_SIZE,
    };
  } catch (queryError) {
    console.error("Fetch transaction groups error:", queryError);
    return { data: [], total: 0, page, pageSize: DETAIL_PAGE_SIZE, error: "Gagal memuat grup transaksi" };
  }
}

export async function fetchTransactionsForDate(params: {
  date: string;
  page?: number;
  search?: string;
}): Promise<PaginatedDailyTransactions> {
  const { error } = await requireAdmin();
  const page = Number.isSafeInteger(params.page) ? Math.max(1, params.page ?? 1) : 1;
  const empty = { data: [], total: 0, page, pageSize: DETAIL_PAGE_SIZE, totalPendapatanKotor: 0, totalBagianKaryawan: 0, totalPendapatanBersih: 0 };
  if (error) return { ...empty, error };
  const startDate = jakartaDateToUtcSql(params.date);
  const endDate = jakartaDateToUtcSql(params.date, true);
  const requestedSearch = params.search?.trim().slice(0, 100) ?? "";
  const search = requestedSearch && !params.date.includes(requestedSearch) ? requestedSearch : "";
  const searchSql = search
    ? `AND (t.plat_nomor LIKE ? OR u.username LIKE ? OR u.nama_lengkap LIKE ? OR CONCAT(jk.kategori, ' ', jk.ukuran) LIKE ?)`
    : "";
  const queryParams: unknown[] = [startDate, endDate];
  if (search) {
    const like = `%${search}%`;
    queryParams.push(like, like, like, like);
  }

  try {
    const [[rows], [summaryRows]] = await Promise.all([
      pool.query<RowDataPacket[]>(`
        SELECT t.id, t.jenis_kendaraan_id, t.tanggal_waktu, t.edited_at, t.plat_nomor, t.tarif_total,
               t.tarif_jatah_karyawan, t.tarif_jatah_pemilik, jk.kategori, jk.ukuran,
               u.username, u.nama_lengkap
        FROM transaksi t
        LEFT JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id
        LEFT JOIN users u ON u.id = t.kasir_id
        WHERE t.tanggal_waktu >= ? AND t.tanggal_waktu <= ? ${searchSql}
        ORDER BY t.tanggal_waktu DESC
        LIMIT ? OFFSET ?`,
        [...queryParams, DETAIL_PAGE_SIZE, (page - 1) * DETAIL_PAGE_SIZE]
      ),
      pool.query<RowDataPacket[]>(`
        SELECT COUNT(*) AS total, COALESCE(SUM(tarif_total), 0) AS kotor,
               COALESCE(SUM(tarif_jatah_karyawan), 0) AS karyawan,
               COALESCE(SUM(tarif_jatah_pemilik), 0) AS bersih
        FROM transaksi t
        LEFT JOIN jenis_kendaraan jk ON jk.id = t.jenis_kendaraan_id
        LEFT JOIN users u ON u.id = t.kasir_id
        WHERE t.tanggal_waktu >= ? AND t.tanggal_waktu <= ? ${searchSql}`,
        queryParams
      ),
    ]);
    const summary = summaryRows[0] ?? {};
    return {
      data: rows.map((row) => ({
        id: String(row.id), jenis_kendaraan_id: String(row.jenis_kendaraan_id),
        tanggal_waktu: utcSqlToIso(row.tanggal_waktu),
        edited_at: row.edited_at ? utcSqlToIso(row.edited_at) : null,
        plat_nomor: row.plat_nomor ?? null, tarif_total: Number(row.tarif_total),
        tarif_jatah_karyawan: Number(row.tarif_jatah_karyawan), tarif_jatah_pemilik: Number(row.tarif_jatah_pemilik),
        kategori: row.kategori || "-", ukuran: row.ukuran || "-",
        kasir_nama: row.nama_lengkap || row.username || null,
      })),
      total: Number(summary.total), page, pageSize: DETAIL_PAGE_SIZE,
      totalPendapatanKotor: Number(summary.kotor), totalBagianKaryawan: Number(summary.karyawan),
      totalPendapatanBersih: Number(summary.bersih),
    };
  } catch (queryError) {
    console.error("Fetch daily transactions error:", queryError);
    return { ...empty, error: "Gagal memuat transaksi harian" };
  }
}

export async function updateTransaksi(params: {
  id: string;
  jenisKendaraanId: string;
  platNomor: string | null;
  expectedEditedAt: string | null;
}) {
  const { error: authError, user: currentUser } = await requireAdmin();
  if (authError || !currentUser) return { error: authError ?? "Anda harus login" };

  if (!isUuid(params.id) || !isUuid(params.jenisKendaraanId)) {
    return { error: "Data transaksi tidak valid" };
  }

  const platNomor = params.platNomor?.trim().toUpperCase() || null;
  if (platNomor && platNomor.length > 50) return { error: "Plat nomor maksimal 50 karakter" };

  const connection = await pool.getConnection();
  let oldTransaksi: RowDataPacket | undefined;
  let newValue: Record<string, unknown> | undefined;

  try {
    await connection.beginTransaction();
    const [oldRows] = await connection.query<RowDataPacket[]>(
      `SELECT jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan,
              tarif_jatah_pemilik, edited_at
       FROM transaksi WHERE id = ? LIMIT 1 FOR UPDATE`,
      [params.id],
    );
    oldTransaksi = oldRows[0];
    if (!oldTransaksi) {
      await connection.rollback();
      return { error: "Transaksi tidak ditemukan" };
    }

    const currentEditedAt = oldTransaksi.edited_at ? utcSqlToIso(oldTransaksi.edited_at) : null;
    if (currentEditedAt !== params.expectedEditedAt) {
      await connection.rollback();
      return { error: "Transaksi sudah diubah dari perangkat lain. Muat ulang lalu periksa kembali." };
    }

    const vehicleChanged = String(oldTransaksi.jenis_kendaraan_id) !== params.jenisKendaraanId;
    let tarif = Number(oldTransaksi.tarif_total);
    let jatahKaryawan = Number(oldTransaksi.tarif_jatah_karyawan);
    let jatahPemilik = Number(oldTransaksi.tarif_jatah_pemilik);

    if (vehicleChanged) {
      const [vehicleRows] = await connection.query<RowDataPacket[]>(
        `SELECT tarif_default, jatah_karyawan, jatah_pemilik
         FROM jenis_kendaraan WHERE id = ? AND aktif = 1 LIMIT 1`,
        [params.jenisKendaraanId],
      );
      const vehicle = vehicleRows[0];
      if (!vehicle) {
        await connection.rollback();
        return { error: "Jenis kendaraan tidak ditemukan atau sudah nonaktif" };
      }
      tarif = Number(vehicle.tarif_default);
      jatahKaryawan = Number(vehicle.jatah_karyawan);
      jatahPemilik = Number(vehicle.jatah_pemilik);
    }

    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE transaksi
       SET jenis_kendaraan_id = ?, plat_nomor = ?, tarif_total = ?,
           tarif_jatah_karyawan = ?, tarif_jatah_pemilik = ?, edited_at = UTC_TIMESTAMP(6)
       WHERE id = ?`,
      [
        params.jenisKendaraanId,
        platNomor,
        tarif,
        jatahKaryawan,
        jatahPemilik,
        params.id,
      ],
    );
    if (result.affectedRows !== 1) throw new Error("Update transaksi tidak mengubah satu baris");
    await connection.commit();

    newValue = {
      jenis_kendaraan_id: params.jenisKendaraanId,
      plat_nomor: platNomor,
      tarif_total: tarif,
      tarif_jatah_karyawan: jatahKaryawan,
      tarif_jatah_pemilik: jatahPemilik,
    };
    await logActivity({
      actor: toActivityActor(currentUser),
      action: "UPDATE",
      entityType: "transaksi",
      entityId: params.id,
      description: `Admin mengubah transaksi plat "${platNomor ?? oldTransaksi.plat_nomor ?? "-"}"`,
      oldValue: {
        jenis_kendaraan_id: oldTransaksi.jenis_kendaraan_id,
        plat_nomor: oldTransaksi.plat_nomor,
        tarif_total: Number(oldTransaksi.tarif_total),
        tarif_jatah_karyawan: Number(oldTransaksi.tarif_jatah_karyawan),
        tarif_jatah_pemilik: Number(oldTransaksi.tarif_jatah_pemilik),
      },
      newValue,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Update transaksi error:", error);
    return { error: "Gagal mengubah transaksi" };
  } finally {
    connection.release();
  }

  revalidatePath("/admin/rekap");
  return { success: true };
}

export async function deleteTransaksi(id: string) {
  const { error: authError, user: currentUser } = await requireAdmin();
  if (authError || !currentUser) return { error: authError ?? "Anda harus login" };
  if (!isUuid(id)) return { error: "ID transaksi tidak valid" };

  const connection = await pool.getConnection();
  let target: RowDataPacket | undefined;

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT plat_nomor, tarif_total, tarif_jatah_karyawan,
              tarif_jatah_pemilik, kasir_id
       FROM transaksi WHERE id = ? LIMIT 1 FOR UPDATE`,
      [id],
    );
    target = rows[0];
    if (!target) {
      await connection.rollback();
      return { error: "Transaksi tidak ditemukan" };
    }

    const [result] = await connection.query<ResultSetHeader>("DELETE FROM transaksi WHERE id = ?", [id]);
    if (result.affectedRows !== 1) throw new Error("Delete transaksi tidak menghapus satu baris");
    await connection.commit();

    await logActivity({
      actor: toActivityActor(currentUser),
      action: "DELETE",
      entityType: "transaksi",
      entityId: id,
      description: `Admin menghapus transaksi plat "${target?.plat_nomor ?? "-"}"`,
      oldValue: target
        ? {
            plat_nomor: target.plat_nomor,
            tarif_total: Number(target.tarif_total),
            tarif_jatah_karyawan: Number(target.tarif_jatah_karyawan),
            tarif_jatah_pemilik: Number(target.tarif_jatah_pemilik),
            kasir_id: target.kasir_id,
          }
        : undefined,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Delete transaksi error:", error);
    return { error: "Gagal menghapus transaksi" };
  } finally {
    connection.release();
  }

  revalidatePath("/admin/rekap");
  return { success: true };
}

export async function fetchJenisKendaraanAktif() {
  const { error: authError } = await requireAdmin();
  if (authError) return [];

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, kategori, ukuran FROM jenis_kendaraan WHERE aktif = 1 ORDER BY kategori DESC, ukuran ASC",
    );
    return rows as { id: string; kategori: string; ukuran: string }[];
  } catch (error) {
    console.error("Fetch jenis kendaraan error:", error);
    return [];
  }
}
