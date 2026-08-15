import mysql from "mysql2/promise"

const globalForDb = globalThis as unknown as {
  dbPool: mysql.Pool | undefined
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error("DATABASE_URL belum dikonfigurasi")
  }
  return url
}

const pool =
  globalForDb.dbPool ??
  mysql.createPool({
    uri: getDatabaseUrl(),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    maxIdle: Number(process.env.DB_MAX_IDLE ?? 10),
    idleTimeout: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 60000),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // Critical: DATETIME is stored as UTC text and converted explicitly by the app.
    // This prevents the server's OS timezone from changing business dates.
    dateStrings: true,
    charset: "utf8mb4",
  })

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbPool = pool
}

export default pool
