import { RekapDashboard } from "./RekapDashboard"

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default function RekapPage() {
  const today = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(today.getDate() - 29) // 30 hari termasuk hari ini

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Rekap Laporan</h1>
        <p className="text-slate-500 mt-2 text-base">
          Ringkasan pendapatan harian, tren, dan detail transaksi.
        </p>
      </div>

      <RekapDashboard
        defaultDateFrom={formatDateInput(thirtyDaysAgo)}
        defaultDateTo={formatDateInput(today)}
      />
    </div>
  )
}