import { BUSINESS_TIMEZONE, addJakartaDays } from "@/lib/datetime"

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

export function normalizeTanggalInput(tanggal: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(tanggal) ? `${tanggal}T00:00:00+07:00` : tanggal
}

export function formatTanggalSingkat(tanggal: string) {
  const d = new Date(normalizeTanggalInput(tanggal))
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", timeZone: BUSINESS_TIMEZONE })
}

export function formatWaktu(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TIMEZONE })
}

export function formatTanggalPanjang(iso: string) {
  const d = new Date(normalizeTanggalInput(iso))
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: BUSINESS_TIMEZONE })
}

export function getTanggalKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIMEZONE }).format(new Date(iso))
}

export function startOfWeekWib(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+07:00`)
  const dayNum = d.getUTCDay()
  const diff = dayNum === 0 ? 6 : dayNum - 1
  return addJakartaDays(dateStr, -diff)
}

export function startOfMonthWib(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`
}
