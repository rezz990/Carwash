import { RekapDashboard } from "@/features/rekap/RekapDashboard"
import { addJakartaDays, todayJakarta } from "@/lib/datetime"

export default function RekapPage() {
  const today = todayJakarta()
  const thirtyDaysAgo = addJakartaDays(today, -29)

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Rekap Laporan</h1>
        <p className="text-slate-500 mt-1.5 sm:mt-2 text-sm sm:text-base">
          Ringkasan pendapatan harian, tren, dan detail transaksi.
        </p>
      </div>

      <RekapDashboard defaultDateFrom={thirtyDaysAgo} defaultDateTo={today} />
    </div>
  )
}
