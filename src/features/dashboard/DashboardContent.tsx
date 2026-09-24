"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  CarFront,
  CircleDollarSign,
  Receipt,
  RefreshCw,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react"
import { OverviewChart } from "./OverviewChart"
import { ErrorNotice } from "@/components/ui/Feedback"
import { useRealtimeRekap } from "@/hooks/useRealtimeRekap"
import { formatRupiah, formatWaktu } from "@/lib/formatters"
import type { OverviewStats } from "./actions"

function Metric({ label, value, icon: Icon, tone = "slate", note }: {
  label: string
  value: string
  icon: React.ElementType
  tone?: "slate" | "green" | "amber"
  note?: string
}) {
  const color = tone === "green"
    ? "bg-emerald-50 text-emerald-700"
    : tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-600"

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-5 text-slate-500 sm:text-sm">{label}</p>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={18} /></span>
      </div>
      <p className="mt-2 break-words text-xl font-bold tracking-tight text-slate-950 tabular-nums sm:text-2xl">{value}</p>
      {note && <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>}
    </article>
  )
}

const quickLinks = [
  { href: "/admin/rekap", label: "Buka rekap", icon: BarChart3 },
  { href: "/admin/tarif", label: "Atur tarif", icon: Receipt },
  { href: "/admin/users", label: "Kelola user", icon: UserCog },
]

export function DashboardContent({ stats }: { stats: OverviewStats }) {
  const router = useRouter()
  const { pendingRefresh } = useRealtimeRekap(() => router.refresh(), { debounceMs: 1_500 })
  const perubahan = stats.persenPerubahan === null
    ? "Belum ada pembanding kemarin"
    : `${stats.persenPerubahan >= 0 ? "+" : ""}${stats.persenPerubahan.toFixed(0)}% dari kemarin`

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">Ringkasan operasional</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Hari ini</h1>
        </div>
        {pendingRefresh && (
          <span role="status" className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            <RefreshCw size={14} className="animate-spin" /> Memperbarui
          </span>
        )}
      </header>

      {stats.error && <ErrorNotice message={stats.error} />}

      <section aria-label="Statistik hari ini" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className="col-span-2 overflow-hidden rounded-2xl bg-slate-950 p-5 text-white shadow-sm lg:col-span-2 lg:row-span-2 lg:flex lg:flex-col lg:justify-between lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-300">Pendapatan kotor hari ini</p>
              <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">{formatRupiah(stats.pendapatanHariIni)}</p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-slate-950"><CircleDollarSign size={23} /></span>
          </div>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-4">
            <div><p className="text-xs text-slate-400">Bagian pemilik</p><p className="mt-1 text-lg font-semibold tabular-nums">{formatRupiah(stats.bagianPemilikHariIni)}</p></div>
            <p className="text-xs font-medium text-slate-300">{perubahan}</p>
          </div>
        </article>

        <Metric label="Transaksi" value={String(stats.transaksiHariIni)} icon={CarFront} />
        <Metric label="Kasir aktif" value={String(stats.jumlahKasirAktif)} icon={Users} tone="amber" note={stats.kategoriTerlarisMingguIni ? `Terlaris: ${stats.kategoriTerlarisMingguIni}` : undefined} />
        <div className="col-span-2 lg:col-span-2">
          <Metric label="Rata-rata pendapatan kotor per hari (7 hari)" value={formatRupiah(Math.round(stats.rataRataPendapatan7Hari))} icon={TrendingUp} tone="green" />
        </div>
      </section>

      <nav aria-label="Aksi cepat" className="grid grid-cols-3 gap-2 sm:gap-3">
        {quickLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-yellow-300 hover:bg-yellow-50 sm:flex-row sm:text-sm">
            <Icon size={19} className="text-yellow-700" /> {label}
          </Link>
        ))}
      </nav>

      <OverviewChart />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div><h2 className="font-bold text-slate-900">Transaksi terbaru</h2><p className="mt-0.5 text-xs text-slate-500">Aktivitas terakhir dari semua kasir</p></div>
          <Link href="/admin/rekap" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-yellow-700">Semua <ArrowRight size={16} /></Link>
        </div>
        <div className="divide-y divide-slate-100">
          {stats.transaksiTerbaru.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700"><CarFront size={19} /></span>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{transaction.kategori} {transaction.ukuran}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{transaction.plat_nomor === "B0000XX" ? "Tanpa plat" : transaction.plat_nomor || "Tanpa plat"} · {formatWaktu(transaction.tanggal_waktu)} WIB</span></span>
              </span>
              <strong className="shrink-0 text-sm font-semibold text-slate-900 tabular-nums">{formatRupiah(transaction.tarif_total)}</strong>
            </div>
          ))}
          {stats.transaksiTerbaru.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">Belum ada transaksi hari ini.</div>}
        </div>
      </section>
    </div>
  )
}
