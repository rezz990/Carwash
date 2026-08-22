"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { OverviewChart } from "./OverviewChart"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animation"
import { useRealtimeRekap } from "@/hooks/useRealtimeRekap"
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
  ArrowRight,
  Receipt,
  UserCog,
  BarChart3,
  RefreshCw,
} from "lucide-react"

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

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface Transaksi {
  id: string | number
  kategori: string
  ukuran: string
  plat_nomor: string | null
  tanggal_waktu: string
  tarif_total: number
}

interface Stats {
  error?: string
  pendapatanHariIni: number
  transaksiHariIni: number
  rataRataPendapatan7Hari: number
  jumlahKasirAktif: number
  persenPerubahan: number | null
  kategoriTerlarisMingguIni: string | null
  transaksiTerbaru: Transaksi[]
}

/* ─── Stat Card ───────────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
  delay,
}: {
  label: string
  value: string
  sub?: string
  accent?: "indigo" | "emerald" | "amber" | "slate"
  icon: React.ElementType
  delay: number
}) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  }

  const textColorMap = {
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    slate: "text-slate-900",
  }

  return (
    <FadeIn delay={delay}>
      <motion.div
        whileHover={{ y: -4, boxShadow: "0 12px 24px -8px rgba(0,0,0,0.1)" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5 cursor-default"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-1.5 tabular-nums ${textColorMap[accent || "slate"]}`}>
              {value}
            </p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl border ${colorMap[accent || "slate"]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </motion.div>
    </FadeIn>
  )
}

/* ─── Nav Card ────────────────────────────────────────────────────────────── */
function NavCard({
  href,
  title,
  desc,
  icon: Icon,
}: {
  href: string
  title: string
  desc: string
  icon: React.ElementType
}) {
  return (
    <StaggerItem>
      <Link href={href} className="group block h-full">
        <motion.div
          whileHover={{ y: -6, boxShadow: "0 20px 40px -12px rgba(99, 102, 241, 0.15)" }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:border-indigo-200 hover:bg-white transition-all duration-300 h-full flex flex-col relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transform group-hover:scale-110 transition-all duration-500 text-indigo-600">
            <Icon className="w-20 h-20" />
          </div>

          <motion.div
            className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300"
            whileHover={{ rotate: 5 }}
          >
            <Icon className="w-6 h-6" />
          </motion.div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500 flex-1 leading-relaxed">{desc}</p>

          <div className="mt-6 flex items-center text-indigo-600 text-sm font-semibold">
            <span>Buka menu</span>
            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </motion.div>
      </Link>
    </StaggerItem>
  )
}

/* ─── Main Content ────────────────────────────────────────────────────────── */
export function DashboardContent({ stats }: { stats: Stats }) {
    const router = useRouter()
  const perubahanLabel =
    stats.persenPerubahan === null
      ? null
      : `${stats.persenPerubahan >= 0 ? "+" : ""}${stats.persenPerubahan.toFixed(0)}% vs kemarin`
  const {pendingRefresh} = useRealtimeRekap(() => {
    router.refresh();
  }, { debounceMs: 3000})
  return (
    <div className="space-y-5 sm:space-y-8 min-w-0">
      <FadeIn>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          {pendingRefresh && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium border border-indigo-100 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Memperbarui...
            </span>
          )}
        </div>
        <p className="text-slate-500 mt-1.5 sm:mt-2 text-base sm:text-lg">
          Selamat datang di panel admin POS Carwash.
        </p>
      </FadeIn>

      {stats.error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl"
        >
          {stats.error}
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pendapatan Hari Ini"
          value={formatRupiah(stats.pendapatanHariIni)}
          sub={perubahanLabel || undefined}
          accent="indigo"
          icon={DollarSign}
          delay={0.1}
        />
        <StatCard
          label="Transaksi Hari Ini"
          value={stats.transaksiHariIni.toString()}
          accent="slate"
          icon={ShoppingCart}
          delay={0.2}
        />
        <StatCard
          label="Rata-rata / Hari (7 hari)"
          value={formatRupiah(Math.round(stats.rataRataPendapatan7Hari))}
          accent="emerald"
          icon={TrendingUp}
          delay={0.3}
        />
        <StatCard
          label="Kasir Aktif"
          value={stats.jumlahKasirAktif.toString()}
          sub={
            stats.kategoriTerlarisMingguIni
              ? `Terlaris minggu ini: ${stats.kategoriTerlarisMingguIni}`
              : undefined
          }
          accent="amber"
          icon={Users}
          delay={0.4}
        />
      </div>

      {/* Chart */}
      <FadeIn delay={0.5}>
        <OverviewChart />
      </FadeIn>

      {/* Transaksi Terbaru */}
      <FadeIn delay={0.6}>
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700">Transaksi Terbaru</h3>
            <Link
              href="/admin/rekap"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
            >
              Lihat semua
              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.transaksiTerbaru.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.05 }}
                whileHover={{ backgroundColor: "rgba(99, 102, 241, 0.03)" }}
                className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {t.kategori === "Motor" ? "M" : "🚗"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {t.kategori} {t.ukuran}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t.plat_nomor === "B0000XX"
                      ? "TANPA PLAT"
                      : t.plat_nomor || "-"} · {formatWaktu(t.tanggal_waktu)}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-900 tabular-nums">
                  {formatRupiah(t.tarif_total)}
                </p>
              </motion.div>
            ))}
            {stats.transaksiTerbaru.length === 0 && (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Belum ada transaksi</div>
            )}
          </div>
        </div>
      </FadeIn>

      {/* Kartu Navigasi */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NavCard
          href="/admin/tarif"
          title="Kelola Tarif"
          desc="Atur harga untuk setiap jenis kendaraan dan sesuaikan jatah karyawan/pemilik dengan mudah."
          icon={Receipt}
        />
        <NavCard
          href="/admin/users"
          title="Kelola User"
          desc="Kelola akses akun sistem, tambah kasir baru, atau atur peran administratif untuk tim Anda."
          icon={UserCog}
        />
        <NavCard
          href="/admin/rekap"
          title="Rekap Laporan"
          desc="Lihat detail pendapatan, pantau histori transaksi, dan export laporan data secara menyeluruh."
          icon={BarChart3}
        />
      </StaggerContainer>
    </div>
  )
}
