import "./load-env.js"
import mysql from "mysql2/promise"
import pg from "pg"

const { Pool: PgPool } = pg

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL?.trim()
const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY?.trim()
const DATABASE_URL = process.env.DATABASE_URL?.trim()

if (!DATABASE_URL) throw new Error("DATABASE_URL belum dikonfigurasi")
if (!SUPABASE_DB_URL && (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)) {
  throw new Error("Set SUPABASE_DB_URL (disarankan), atau SUPABASE_URL + SUPABASE_SERVICE_KEY")
}

function toMysqlUtc(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Tanggal tidak valid: ${value}`)
  return date.toISOString().slice(0, 19).replace("T", " ")
}

async function fetchRest(table: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`Gagal membaca ${table}: ${res.status} ${res.statusText}`)
  return res.json()
}

async function migrateFromPostgres(mysqlPool: mysql.Pool) {
  const source = new PgPool({ connectionString: SUPABASE_DB_URL, max: 2 })

  try {
    const profilesResult = await source.query(`
      SELECT id::text, username, nama_lengkap, role, aktif, created_at
      FROM public.profiles
      ORDER BY created_at ASC
    `)

    const authResult = await source.query(`
      SELECT id::text, encrypted_password
      FROM auth.users
    `)

    const authById = new Map<string, string>()
    for (const row of authResult.rows) {
      if (row.encrypted_password) authById.set(row.id, row.encrypted_password)
    }

    for (const profile of profilesResult.rows) {
      const passwordHash = authById.get(profile.id)
      if (!passwordHash) {
        throw new Error(`Password hash Supabase tidak ditemukan untuk user ${profile.username} (${profile.id}). Migrasi dihentikan agar akun tidak menjadi rusak.`)
      }

      await mysqlPool.query(
        `INSERT INTO users (id, username, password_hash, nama_lengkap, role, aktif, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           username = VALUES(username), password_hash = VALUES(password_hash), nama_lengkap = VALUES(nama_lengkap),
           role = VALUES(role), aktif = VALUES(aktif), created_at = VALUES(created_at)`,
        [profile.id, profile.username, passwordHash, profile.nama_lengkap, profile.role, profile.aktif !== false, toMysqlUtc(profile.created_at)]
      )
    }

    const vehicles = await source.query(`
      SELECT id::text, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik, aktif, created_at
      FROM public.jenis_kendaraan
      ORDER BY created_at ASC
    `)

    for (const row of vehicles.rows) {
      await mysqlPool.query(
        `INSERT INTO jenis_kendaraan (id, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik, aktif, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           kategori = VALUES(kategori), ukuran = VALUES(ukuran), tarif_default = VALUES(tarif_default),
           jatah_karyawan = VALUES(jatah_karyawan), jatah_pemilik = VALUES(jatah_pemilik), aktif = VALUES(aktif), created_at = VALUES(created_at)`,
        [row.id, row.kategori, row.ukuran, row.tarif_default, row.jatah_karyawan, row.jatah_pemilik, row.aktif !== false, toMysqlUtc(row.created_at)]
      )
    }

    const transactions = await source.query(`
      SELECT id::text, tanggal_waktu, jenis_kendaraan_id::text, plat_nomor,
             tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id::text, created_at
      FROM public.transaksi
      ORDER BY tanggal_waktu ASC
    `)

    for (const row of transactions.rows) {
      await mysqlPool.query(
        `INSERT INTO transaksi
          (id, tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           tanggal_waktu = VALUES(tanggal_waktu), jenis_kendaraan_id = VALUES(jenis_kendaraan_id),
           plat_nomor = VALUES(plat_nomor), tarif_total = VALUES(tarif_total),
           tarif_jatah_karyawan = VALUES(tarif_jatah_karyawan), tarif_jatah_pemilik = VALUES(tarif_jatah_pemilik),
           kasir_id = VALUES(kasir_id), created_at = VALUES(created_at)`,
        [row.id, toMysqlUtc(row.tanggal_waktu), row.jenis_kendaraan_id, row.plat_nomor,
          row.tarif_total, row.tarif_jatah_karyawan, row.tarif_jatah_pemilik, row.kasir_id,
          toMysqlUtc(row.created_at ?? row.tanggal_waktu)]
      )
    }

    console.log(`Migrasi selesai: ${profilesResult.rowCount} users, ${vehicles.rowCount} jenis kendaraan, ${transactions.rowCount} transaksi.`)
  } finally {
    await source.end()
  }
}

async function migrateFromRest(mysqlPool: mysql.Pool) {
  console.warn("WARNING: mode REST dipakai. Untuk password hash yang benar, SUPABASE_DB_URL lebih disarankan.")

  const profiles = await fetchRest("profiles")
  const vehicles = await fetchRest("jenis_kendaraan")
  const transactions = await fetchRest("transaksi")

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: { apikey: SUPABASE_SERVICE_KEY!, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  })
  if (!authRes.ok) throw new Error(`Gagal membaca auth.users: ${authRes.status} ${authRes.statusText}`)
  const authUsers = (await authRes.json()).users ?? []

  const authById = new Map<string, string>()
  for (const user of authUsers) {
    if (user.encrypted_password) authById.set(user.id, user.encrypted_password)
  }

  for (const profile of profiles) {
    const passwordHash = authById.get(profile.id)
    if (!passwordHash) {
      throw new Error(`Password hash tidak tersedia untuk ${profile.username}. Gunakan SUPABASE_DB_URL agar hash auth.users bisa dibaca.`)
    }
    await mysqlPool.query(
      `INSERT INTO users (id, username, password_hash, nama_lengkap, role, aktif, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), nama_lengkap=VALUES(nama_lengkap), role=VALUES(role), aktif=VALUES(aktif)`,
      [profile.id, profile.username, passwordHash, profile.nama_lengkap, profile.role, profile.aktif !== false, toMysqlUtc(profile.created_at)]
    )
  }

  for (const row of vehicles) {
    await mysqlPool.query(
      `INSERT INTO jenis_kendaraan (id, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik, aktif, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE tarif_default=VALUES(tarif_default), jatah_karyawan=VALUES(jatah_karyawan), jatah_pemilik=VALUES(jatah_pemilik), aktif=VALUES(aktif)`,
      [row.id, row.kategori, row.ukuran, row.tarif_default, row.jatah_karyawan, row.jatah_pemilik, row.aktif !== false, toMysqlUtc(row.created_at)]
    )
  }

  for (const row of transactions) {
    await mysqlPool.query(
      `INSERT INTO transaksi (id, tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE tanggal_waktu=VALUES(tanggal_waktu), jenis_kendaraan_id=VALUES(jenis_kendaraan_id), plat_nomor=VALUES(plat_nomor), tarif_total=VALUES(tarif_total), tarif_jatah_karyawan=VALUES(tarif_jatah_karyawan), tarif_jatah_pemilik=VALUES(tarif_jatah_pemilik), kasir_id=VALUES(kasir_id)`,
      [row.id, toMysqlUtc(row.tanggal_waktu), row.jenis_kendaraan_id, row.plat_nomor, row.tarif_total, row.tarif_jatah_karyawan, row.tarif_jatah_pemilik, row.kasir_id, toMysqlUtc(row.created_at ?? row.tanggal_waktu)]
    )
  }

  console.log(`Migrasi selesai: ${profiles.length} users, ${vehicles.length} jenis kendaraan, ${transactions.length} transaksi.`)
}

async function main() {
  const mysqlPool = mysql.createPool({ uri: DATABASE_URL, waitForConnections: true, connectionLimit: 5 })
  try {
    if (SUPABASE_DB_URL) await migrateFromPostgres(mysqlPool)
    else await migrateFromRest(mysqlPool)
  } finally {
    await mysqlPool.end()
  }
}

main().catch((error) => {
  console.error("Migrasi gagal:", error)
  process.exit(1)
})
