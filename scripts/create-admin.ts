import "./load-env.js"
import bcrypt from "bcryptjs"
import mysql from "mysql2/promise"

const [usernameArg, passwordArg, namaArg] = process.argv.slice(2)
const username = (usernameArg || process.env.ADMIN_USERNAME || "").trim()
const password = passwordArg || process.env.ADMIN_PASSWORD || ""
const namaLengkap = (namaArg || process.env.ADMIN_NAME || "").trim() || null

if (!username || !password) {
  console.error("Usage: npm run db:create-admin -- <username> <password> [nama lengkap]")
  process.exit(1)
}

if (!/^[a-zA-Z0-9_]{3,64}$/.test(username)) {
  throw new Error("Username harus 3-64 karakter dan hanya boleh huruf, angka, underscore.")
}
if (password.length < 6) throw new Error("Password minimal 6 karakter.")

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL belum dikonfigurasi")

const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 2 })

try {
  const passwordHash = await bcrypt.hash(password, 12)
  await pool.query(
    `INSERT INTO users (id, username, password_hash, nama_lengkap, role, aktif)
     VALUES (?, ?, ?, ?, 'admin', 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), nama_lengkap = VALUES(nama_lengkap), role = 'admin', aktif = 1`,
    [crypto.randomUUID(), username, passwordHash, namaLengkap]
  )
  console.log(`Admin '${username}' siap digunakan.`)
} finally {
  await pool.end()
}
