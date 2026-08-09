import Link from "next/link"
import { fetchOverviewStats } from "./actions"
import { OverviewChart } from "./OverviewChart"

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatWaktu(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "indigo" | "emerald" | "amber" | "slate" }) {
  const colorMap = {
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    slate: "text-slate-900",
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1.5 tabular-nums ${colorMap[accent || "slate"]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboard() {
  const stats = await fetchOverviewStats()

  const perubahanLabel =
    stats.persenPerubahan === null
      ? null
      : `${stats.persenPerubahan >= 0 ? "+" : ""}${stats.persenPerubahan.toFixed(0)}% vs kemarin`

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-2 text-lg">Selamat datang di panel admin POS Carwash.</p>
      </div>

      {stats.error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">{stats.error}</div>
      )}

      {/* Stats Hari Ini + Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pendapatan Hari Ini"
          value={formatRupiah(stats.pendapatanHariIni)}
          sub={perubahanLabel || undefined}
          accent="indigo"
        />
        <StatCard
          label="Transaksi Hari Ini"
          value={stats.transaksiHariIni.toString()}
          accent="slate"
        />
        <StatCard
          label="Rata-rata / Hari (7 hari)"
          value={formatRupiah(Math.round(stats.rataRataPendapatan7Hari))}
          accent="emerald"
        />
        <StatCard
          label="Kasir Aktif"
          value={stats.jumlahKasirAktif.toString()}
          sub={stats.kategoriTerlarisMingguIni ? `Terlaris minggu ini: ${stats.kategoriTerlarisMingguIni}` : undefined}
          accent="amber"
        />
      </div>

      {/* Chart tren dengan filter fleksibel */}
      <OverviewChart />

      {/* Preview transaksi terbaru */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">Transaksi Terbaru</h3>
          <Link href="/admin/rekap" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            Lihat semua
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {stats.transaksiTerbaru.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {t.kategori === "Motor" ? "M" : "🚗"}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.kategori} {t.ukuran}</p>
                  <p className="text-xs text-slate-400">{t.plat_nomor || "-"} · {formatWaktu(t.tanggal_waktu)}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900 tabular-nums">{formatRupiah(t.tarif_total)}</p>
            </div>
          ))}
          {stats.transaksiTerbaru.length === 0 && (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">Belum ada transaksi</div>
          )}
        </div>
      </div>

      {/* Kartu navigasi */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/tarif" className="group block h-full">
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 hover:bg-white transition-all duration-300 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transform group-hover:scale-110 transition-all duration-500 text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>

            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">Kelola Tarif</h3>
            <p className="text-slate-500 flex-1 leading-relaxed">Atur harga untuk setiap jenis kendaraan dan sesuaikan jatah karyawan/pemilik dengan mudah.</p>

            <div className="mt-6 flex items-center text-indigo-600 text-sm font-semibold group-hover:gap-2 transition-all">
              <span>Buka menu</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 transition-transform group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </div>
        </Link>

        <Link href="/admin/users" className="group block h-full">
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 hover:bg-white transition-all duration-300 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transform group-hover:scale-110 transition-all duration-500 text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>

            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">Kelola User</h3>
            <p className="text-slate-500 flex-1 leading-relaxed">Kelola akses akun sistem, tambah kasir baru, atau atur peran administratif untuk tim Anda.</p>

            <div className="mt-6 flex items-center text-indigo-600 text-sm font-semibold group-hover:gap-2 transition-all">
              <span>Buka menu</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 transition-transform group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </div>
        </Link>

        <Link href="/admin/rekap" className="group block h-full">
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 hover:bg-white transition-all duration-300 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transform group-hover:scale-110 transition-all duration-500 text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </div>

            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">Rekap Laporan</h3>
            <p className="text-slate-500 flex-1 leading-relaxed">Lihat detail pendapatan, pantau histori transaksi, dan export laporan data secara menyeluruh.</p>

            <div className="mt-6 flex items-center text-indigo-600 text-sm font-semibold group-hover:gap-2 transition-all">
              <span>Buka menu</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 transition-transform group-hover:translate-x-1"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}