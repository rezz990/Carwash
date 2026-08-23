export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatRupiahSingkat(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return value.toString()
}

// PENTING: selalu pakai timeZone: "Asia/Jakarta" eksplisit, jangan andalkan
// timezone bawaan device/browser user (bisa salah setting) atau default
// server. Ini juga menjaga hasil tampilan konsisten dengan pengelompokan
// tanggal yang sudah dihitung di server (lihat actions.ts).
export function normalizeTanggalInput(tanggal: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(tanggal) ? `${tanggal}T00:00:00+07:00` : tanggal
}

export function formatTanggalSingkat(tanggal: string) {
  const d = new Date(normalizeTanggalInput(tanggal))
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", timeZone: "Asia/Jakarta" })
}

export function formatWaktu(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })
}

export function formatTanggalPanjang(iso: string) {
  const d = new Date(normalizeTanggalInput(iso))
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })
}

export function getTanggalKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(iso))
}

export function todayWib(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())
}

export function addWibDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00+07:00`)
  d.setUTCDate(d.getUTCDate() + days)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d)
}

export function startOfWeekWib(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+07:00`)
  const dayNum = d.getUTCDay()
  const diff = dayNum === 0 ? 6 : dayNum - 1
  return addWibDays(dateStr, -diff)
}

export function startOfMonthWib(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`
}

