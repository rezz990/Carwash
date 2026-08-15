import { RekapDashboard } from "./RekapDashboard"
import { addJakartaDays, todayJakarta } from "@/lib/datetime"

export default function RekapPage() {
  // PENTING: jangan pakai new Date().toISOString() di sini — itu tanggal UTC,
  // bukan tanggal WIB. Di production (server jalan di UTC), untuk transaksi
  // yang terjadi jam 00:00-06:59 WIB, toISOString() akan mundur 1 hari dan
  // bikin transaksi hari ini hilang dari default range rekap. Selalu pakai
  // helper Asia/Jakarta yang sama seperti di halaman Overview.
  const today = todayJakarta()
  const thirtyDaysAgo = addJakartaDays(today, -29) // 30 hari termasuk hari ini

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Rekap Laporan</h1>
        <p className="text-slate-500 mt-2 text-base">
          Ringkasan pendapatan harian, tren, dan detail transaksi.
        </p>
      </div>

      <RekapDashboard
        defaultDateFrom={thirtyDaysAgo}
        defaultDateTo={today}
      />
    </div>
  )
}