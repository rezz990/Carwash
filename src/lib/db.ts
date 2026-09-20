import mysql from "mysql2/promise"

const globalForDb = globalThis as unknown as {
  dbPool: mysql.Pool | undefined
}
let localPool: mysql.Pool | undefined

function createPool(): mysql.Pool {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error("DATABASE_URL belum dikonfigurasi")
  }
  const pool = mysql.createPool({
    uri: url,
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
  localPool = pool
  if (process.env.NODE_ENV !== "production") globalForDb.dbPool = pool
  return pool
}

function getPool(): mysql.Pool {
  return globalForDb.dbPool ?? localPool ?? createPool()
}

// Keep route modules importable during build. Configuration is validated when a
// request first uses the database, so a missing secret still fails clearly at runtime.
const pool = new Proxy({} as mysql.Pool, {
  get(_target, property) {
    const activePool = getPool()
    const value = Reflect.get(activePool, property, activePool)
    return typeof value === "function" ? value.bind(activePool) : value
  },
})

export default pool
