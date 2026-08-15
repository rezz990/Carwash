import "./load-env.js"
import fs from "node:fs/promises"
import path from "node:path"
import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL belum dikonfigurasi")

const migrationsDir = path.join(process.cwd(), "migrations")

async function main() {
  const pool = mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: 2,
    multipleStatements: true,
  })

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    const [files] = await pool.query<RowDataPacket[]>(
      "SELECT version FROM schema_migrations ORDER BY version"
    )
    const applied = new Set(files.map((row) => String(row.version)))

    const migrationFiles = (await fs.readdir(migrationsDir))
      .filter((name) => /^\d+_.*\.sql$/i.test(name))
      .sort()

    for (const file of migrationFiles) {
      if (applied.has(file)) {
        console.log(`SKIP  ${file}`)
        continue
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8")
      const connection = await pool.getConnection()
      try {
        await connection.beginTransaction()
        await connection.query(sql)
        await connection.query("INSERT INTO schema_migrations (version) VALUES (?)", [file])
        await connection.commit()
        console.log(`APPLY ${file}`)
      } catch (error) {
        await connection.rollback()
        throw new Error(`Migration gagal pada ${file}: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        connection.release()
      }
    }

    console.log("Database migration selesai.")
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
