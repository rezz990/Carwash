/**
 * Business timezone is WIB (UTC+07:00).
 * Database DATETIME columns store UTC values without timezone metadata.
 * Always convert at the application boundary; never depend on the hosting OS timezone.
 */
export const BUSINESS_TIMEZONE = "Asia/Jakarta"

export function utcSqlToIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString()

  // mysql2 is configured with dateStrings=true, so DATETIME arrives as
  // "YYYY-MM-DD HH:mm:ss". Treat that value as UTC explicitly.
  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  return normalized.endsWith("Z") ? normalized : `${normalized}Z`
}

export function utcSqlToDate(value: string | Date): Date {
  return new Date(utcSqlToIso(value))
}

/** Convert a WIB calendar date to a UTC SQL boundary. */
export function jakartaDateToUtcSql(date: string, endOfDay = false): string {
  const suffix = endOfDay ? "23:59:59" : "00:00:00"
  const utc = new Date(`${date}T${suffix}+07:00`)
  return utc.toISOString().slice(0, 19).replace("T", " ")
}

export function nowUtcSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ")
}

export function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function addJakartaDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00+07:00`)
  d.setUTCDate(d.getUTCDate() + days)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d)
}
