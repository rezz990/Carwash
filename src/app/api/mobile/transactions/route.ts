import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import pool from "@/lib/db";
import {
  jakartaDateToUtcSql,
  nowUtcSql,
  utcSqlToIso,
} from "@/lib/datetime";

import {
  jsonError,
  jsonOk,
  normalizePlate,
  isValidPlate,
  requireMobileAuth,
} from "@/lib/mobile/http";

import {
  emitNewTransaction,
  eventBus,
  EVENT_NEW_TRANSACTION,
  type NewTransactionEvent,
} from "@/lib/events";

import { requireAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 20_000;

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

/* =========================================================
   POST
   Android Kasir membuat transaksi baru
   ========================================================= */

export async function POST(request: Request) {
  const auth = await requireMobileAuth(request, ["kasir"]);

  if ("error" in auth) {
    return auth.error;
  }

  const connection = await pool.getConnection();

  try {
    const body = await request.json();

    const jenisKendaraanId = String(
      body?.jenisKendaraanId ?? "",
    ).trim();

    const plate = normalizePlate(body?.platNomor);

    const requestedDate = parseDate(
      body?.tanggalWaktu,
    );

    if (!jenisKendaraanId) {
      return jsonError(
        400,
        "INVALID_INPUT",
        "Jenis kendaraan wajib dipilih",
      );
    }

    if (!plate || !isValidPlate(plate)) {
      return jsonError(
        400,
        "INVALID_PLATE",
        "Format plat nomor tidak valid",
      );
    }

    if (!requestedDate) {
      return jsonError(
        400,
        "INVALID_DATE",
        "Format tanggal transaksi tidak valid",
      );
    }

    await connection.beginTransaction();

    /* ===============================
       Ambil jenis kendaraan
       =============================== */

    const [vehicleRows] =
      await connection.query<RowDataPacket[]>(
        `SELECT
          id,
          kategori,
          ukuran,
          tarif_default,
          jatah_karyawan,
          jatah_pemilik
        FROM jenis_kendaraan
        WHERE id = ?
          AND aktif = 1
        LIMIT 1`,
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

    /* ===============================
       Cek duplikat plat 10 menit
       =============================== */

    const [duplicateRows] =
      await connection.query<RowDataPacket[]>(
        `SELECT id
         FROM transaksi
         WHERE REPLACE(
           UPPER(plat_nomor),
           ' ',
           ''
         ) = ?
         AND tanggal_waktu >= DATE_SUB(
           UTC_TIMESTAMP(),
           INTERVAL 10 MINUTE
         )
         ORDER BY tanggal_waktu DESC
         LIMIT 1`,
        [plate],
      );

    if (duplicateRows.length) {
      await connection.rollback();

      return jsonError(
        409,
        "DUPLICATE_PLATE",
        "Plat nomor ini baru saja memiliki transaksi",
        {
          transactionId: String(
            duplicateRows[0].id,
          ),
        },
      );
    }

    /* ===============================
       Validasi pembagian tarif
       =============================== */

    const tarif = Number(
      vehicle.tarif_default,
    );

    const jatahKaryawan = Number(
      vehicle.jatah_karyawan,
    );

    const jatahPemilik = Number(
      vehicle.jatah_pemilik,
    );

    if (
      jatahKaryawan + jatahPemilik !== tarif
    ) {
      await connection.rollback();

      return jsonError(
        409,
        "INVALID_TARIFF_CONFIG",
        "Konfigurasi tarif kendaraan tidak valid",
      );
    }

    /* ===============================
       Insert transaksi
       =============================== */

    const id = randomUUID();

    const sqlDate = body?.tanggalWaktu
      ? requestedDate
          .toISOString()
          .slice(0, 19)
          .replace("T", " ")
      : nowUtcSql();

    await connection.query<ResultSetHeader>(
      `INSERT INTO transaksi (
        id,
        tanggal_waktu,
        jenis_kendaraan_id,
        plat_nomor,
        tarif_total,
        tarif_jatah_karyawan,
        tarif_jatah_pemilik,
        kasir_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
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

    /* ===============================
       COMMIT DULU
       =============================== */

    await connection.commit();

    /* ===============================
       BROADCAST REALTIME
       =============================== */

    const realtimeEvent: NewTransactionEvent = {
      id,

      tanggalWaktu: body?.tanggalWaktu
        ? requestedDate.toISOString()
        : new Date().toISOString(),

      platNomor: plate,

      tarif,

      jatahKaryawan,

      jatahPemilik,

      jenisKendaraan: {
        id: String(vehicle.id),
        kategori: String(vehicle.kategori),
        ukuran: String(vehicle.ukuran),
      },

      kasir: {
        username: auth.user.username,
        namaLengkap:
          auth.user.nama_lengkap ?? null,
      },
    };

    /*
     * Emit setelah transaksi berhasil COMMIT.
     *
     * Kalau SSE sedang aktif di admin,
     * event ini langsung dikirim ke browser.
     */
    try {
      emitNewTransaction(realtimeEvent);
    } catch (eventError) {
      /*
       * Jangan menggagalkan response transaksi
       * hanya karena broadcast realtime gagal.
       */
      console.error(
        "Realtime event error:",
        eventError,
      );
    }

    /* ===============================
       RESPONSE ANDROID
       =============================== */

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

          /*
           * RESPONSE INI TETAP DIPERTAHANKAN
           * supaya tidak merusak app Android.
           */
          kasir: {
            id: auth.user.id,
            username: auth.user.username,
          },
        },
      },
      201,
    );
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Abaikan error rollback
    }

    console.error(error);

    return jsonError(
      500,
      "INTERNAL_ERROR",
      "Gagal menyimpan transaksi",
    );
  } finally {
    connection.release();
  }
}

/* =========================================================
   GET
   Ada 2 mode:

   1. Normal:
      /api/mobile/transactions

   2. SSE Admin:
      /api/mobile/transactions?stream=true
   ========================================================= */

export async function GET(request: Request) {
  const url = new URL(request.url);

  const isStream =
    url.searchParams.get("stream") === "true";

  /* =======================================================
     MODE SSE REALTIME ADMIN
     ======================================================= */

  if (isStream) {
    const { error } = await requireAdmin();

    if (error) {
      return new Response(
        JSON.stringify({
          error,
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const encoder = new TextEncoder();

    let heartbeatTimer:
      | ReturnType<typeof setInterval>
      | undefined;

    let listener:
      | ((data: NewTransactionEvent) => void)
      | undefined;

    let closed = false;

    const cleanup = () => {
      if (closed) return;

      closed = true;

      if (listener) {
        eventBus.off(
          EVENT_NEW_TRANSACTION,
          listener,
        );

        listener = undefined;
      }

      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);

        heartbeatTimer = undefined;
      }
    };

    const stream = new ReadableStream({
      start(controller) {
        /*
         * Event pembuka.
         * Comment SSE ini memastikan browser menerima
         * response dan mengetahui koneksi sudah terbuka.
         */
        try {
          controller.enqueue(
            encoder.encode(
              ": connected\n\n",
            ),
          );
        } catch {
          cleanup();
          return;
        }

        listener = (
          data: NewTransactionEvent,
        ) => {
          if (closed) return;

          try {
            const payload =
              `data: ${JSON.stringify(data)}\n\n`;

            controller.enqueue(
              encoder.encode(payload),
            );
          } catch {
            cleanup();
          }
        };

        eventBus.on(
          EVENT_NEW_TRANSACTION,
          listener,
        );

        /*
         * Heartbeat setiap 20 detik.
         *
         * Ini bukan event data.
         * Hanya comment SSE supaya koneksi
         * tidak dianggap idle oleh proxy.
         */
        heartbeatTimer = setInterval(() => {
          if (closed) {
            cleanup();
            return;
          }

          try {
            controller.enqueue(
              encoder.encode(
                ": heartbeat\n\n",
              ),
            );
          } catch {
            cleanup();
          }
        }, HEARTBEAT_INTERVAL_MS);
      },

      cancel() {
        /*
         * Browser menutup EventSource,
         * pindah halaman, refresh, dll.
         */
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type":
          "text/event-stream",

        "Cache-Control":
          "no-cache, no-transform",

        Connection: "keep-alive",

        "X-Accel-Buffering": "no",
      },
    });
  }

  /* =======================================================
     MODE NORMAL - RIWAYAT TRANSAKSI ANDROID
     ======================================================= */

  const auth = await requireMobileAuth(
    request,
    ["kasir"],
  );

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const page = Math.max(
      1,
      Number(
        url.searchParams.get("page") || 1,
      ),
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        Number(
          url.searchParams.get("limit") || 20,
        ),
      ),
    );

    const offset = (page - 1) * limit;

    const from =
      url.searchParams.get("from");

    const to =
      url.searchParams.get("to");

    const search = normalizePlate(
      url.searchParams.get("search"),
    );

    const vehicleId =
      url.searchParams.get(
        "jenisKendaraanId",
      );

    const where: string[] = [];

    const params: unknown[] = [];

    /* ===============================
       Filter tanggal mulai
       =============================== */

    if (from) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
        return jsonError(
          400,
          "INVALID_DATE",
          "Parameter from harus YYYY-MM-DD",
        );
      }

      where.push(
        "t.tanggal_waktu >= ?",
      );

      params.push(
        jakartaDateToUtcSql(from),
      );
    }

    /* ===============================
       Filter tanggal akhir
       =============================== */

    if (to) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return jsonError(
          400,
          "INVALID_DATE",
          "Parameter to harus YYYY-MM-DD",
        );
      }

      where.push(
        "t.tanggal_waktu < ?",
      );

      params.push(
        nextJakartaDayUtc(to),
      );
    }

    /* ===============================
       Search plat
       =============================== */

    if (search) {
      where.push(
        `REPLACE(
          UPPER(t.plat_nomor),
          ' ',
          ''
        ) LIKE ?`,
      );

      params.push(`%${search}%`);
    }

    /* ===============================
       Filter kendaraan
       =============================== */

    if (vehicleId) {
      where.push(
        "t.jenis_kendaraan_id = ?",
      );

      params.push(vehicleId);
    }

    const whereSql = where.join(
      " AND ",
    );

    /* ===============================
       Data transaksi
       =============================== */

    const [rows] =
      await pool.query<RowDataPacket[]>(
        `SELECT
          t.id,
          t.tanggal_waktu,
          t.plat_nomor,
          t.tarif_total,
          t.tarif_jatah_karyawan,
          t.tarif_jatah_pemilik,
          jk.id AS jenis_id,
          jk.kategori,
          jk.ukuran
        FROM transaksi t
        JOIN jenis_kendaraan jk
          ON jk.id = t.jenis_kendaraan_id
        WHERE ${whereSql}
        ORDER BY t.tanggal_waktu DESC
        LIMIT ?
        OFFSET ?`,
        [
          ...params,
          limit,
          offset,
        ],
      );

    /* ===============================
       Summary
       =============================== */

    const [summary] =
      await pool.query<RowDataPacket[]>(
        `SELECT
          COUNT(*) AS count,
          COALESCE(
            SUM(t.tarif_total),
            0
          ) AS omzet,
          COALESCE(
            SUM(t.tarif_jatah_karyawan),
            0
          ) AS jatahKaryawan,
          COALESCE(
            SUM(t.tarif_jatah_pemilik),
            0
          ) AS jatahPemilik
        FROM transaksi t
        WHERE ${whereSql}`,
        params,
      );

    const total = Number(
      summary[0].count,
    );

    /* ===============================
       Response Android
       =============================== */

    return jsonOk({
      data: rows.map((r) => ({
        id: String(r.id),

        tanggalWaktu:
          utcSqlToIso(
            String(r.tanggal_waktu),
          ),

        platNomor:
          r.plat_nomor,

        tarif:
          Number(r.tarif_total),

        jatahKaryawan:
          Number(
            r.tarif_jatah_karyawan,
          ),

        jatahPemilik:
          Number(
            r.tarif_jatah_pemilik,
          ),

        jenisKendaraan: {
          id: String(r.jenis_id),
          kategori: String(
            r.kategori,
          ),
          ukuran: String(
            r.ukuran,
          ),
        },
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit,
          ),
      },

      summary: {
        omzet:
          Number(summary[0].omzet),

        jatahKaryawan:
          Number(
            summary[0]
              .jatahKaryawan,
          ),

        jatahPemilik:
          Number(
            summary[0]
              .jatahPemilik,
          ),
      },
    });
  } catch (error) {
    console.error(error);

    return jsonError(
      500,
      "INTERNAL_ERROR",
      "Gagal memuat transaksi",
    );
  }
}