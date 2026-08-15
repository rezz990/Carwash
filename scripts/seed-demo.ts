import "./load-env.js"
import bcrypt from "bcryptjs"
import mysql from "mysql2/promise"

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error("DATABASE_URL belum dikonfigurasi")

const pool = mysql.createPool({
  uri: databaseUrl,
  waitForConnections: true,
  connectionLimit: 3,
  charset: "utf8mb4",
})

const CASHIERS = [
  { username: "kasir01", name: "Kasir 01", password: "kasir123" },
  { username: "kasir02", name: "Kasir 02", password: "kasir123" },
  { username: "kasir03", name: "Kasir 03", password: "kasir123" },
]

const PLATE_PREFIXES = ["D", "F", "B", "Z", "T"]
const LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ"

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPlate(index: number) {
  const prefix = PLATE_PREFIXES[index % PLATE_PREFIXES.length]
  const number = String(randomInt(1000, 9999))
  const a = LETTERS[randomInt(0, LETTERS.length - 1)]
  const b = LETTERS[randomInt(0, LETTERS.length - 1)]
  return `${prefix} ${number} ${a}${b}`
}

function randomDateWithinDays(days: number) {
  const now = Date.now()
  const start = now - days * 24 * 60 * 60 * 1000
  const timestamp = randomInt(start, now)
  const d = new Date(timestamp)

  // MySQL DATETIME is stored as UTC text in this project.
  return d.toISOString().slice(0, 19).replace("T", " ")
}

async function main() {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    // 1. Pastikan ada akun kasir untuk testing.
    const cashierIds: string[] = []

    for (const cashier of CASHIERS) {
      const passwordHash = await bcrypt.hash(cashier.password, 12)
      const id = crypto.randomUUID()

      await connection.query(
        `INSERT INTO users (id, username, password_hash, nama_lengkap, role, aktif)
         VALUES (?, ?, ?, ?, 'kasir', 1)
         ON DUPLICATE KEY UPDATE
           nama_lengkap = VALUES(nama_lengkap),
           role = 'kasir',
           aktif = 1`,
        [id, cashier.username, passwordHash, cashier.name]
      )

      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        "SELECT id FROM users WHERE username = ? LIMIT 1",
        [cashier.username]
      )

      if (!rows[0]?.id) throw new Error(`Gagal mendapatkan ID kasir ${cashier.username}`)
      cashierIds.push(String(rows[0].id))
    }

    // 2. Ambil semua jenis kendaraan aktif.
    const [vehicleRows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT id, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik
       FROM jenis_kendaraan
       WHERE aktif = 1
       ORDER BY kategori, ukuran`
    )

    if (vehicleRows.length === 0) {
      throw new Error("Belum ada jenis_kendaraan aktif. Jalankan npm run db:migrate terlebih dahulu.")
    }

    // 3. Generate 300 transaksi dummy, tersebar 30 hari terakhir.
    const totalTransactions = Number(process.env.SEED_TRANSACTION_COUNT ?? 300)
    const rows: unknown[][] = []

    for (let i = 0; i < totalTransactions; i++) {
      const vehicle = vehicleRows[randomInt(0, vehicleRows.length - 1)]
      const cashierId = cashierIds[randomInt(0, cashierIds.length - 1)]
      const tarif = Number(vehicle.tarif_default)
      const jatahKaryawan = Number(vehicle.jatah_karyawan)
      const jatahPemilik = Number(vehicle.jatah_pemilik)

      rows.push([
        crypto.randomUUID(),
        randomDateWithinDays(30),
        vehicle.id,
        randomPlate(i),
        tarif,
        jatahKaryawan,
        jatahPemilik,
        cashierId,
      ])
    }

    await connection.query(
      `INSERT INTO transaksi
       (id, tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total,
        tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id)
       VALUES ?`,
      [rows]
    )

    await connection.commit()

    console.log("\nSeed demo berhasil.")
    console.log(`- Kasir dibuat/diaktifkan: ${CASHIERS.map((c) => c.username).join(", ")}`)
    console.log(`- Password semua kasir: kasir123`)
    console.log(`- Transaksi dummy: ${totalTransactions}`)
    console.log("- Rentang transaksi: 30 hari terakhir")
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error("Seed demo gagal:")
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
