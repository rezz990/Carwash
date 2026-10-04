"use client"

import { useEffect, useState } from "react"
import { BarChart3, LoaderCircle } from "lucide-react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { fetchChartData, type ChartPoint } from "./actions"
import { ErrorNotice } from "@/components/ui/Feedback"
import { todayJakarta } from "@/lib/datetime"

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
type Mode = "harian" | "bulanan" | "rentang"

function currency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)
}

function shortCurrency(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${Math.round(value / 1_000)}rb`
  return String(value)
}

function Select({ label, value, onChange, children }: {
  label: string
  value: number
  onChange: (value: number) => void
  children: React.ReactNode
}) {
  return <label className="min-w-0 flex-1 text-xs font-medium text-slate-500"><span className="mb-1.5 block">{label}</span><select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800" value={value} onChange={(event) => onChange(Number(event.target.value))}>{children}</select></label>
}

export function OverviewChart() {
  const [initialDate] = useState(() => {
    const [year, month] = todayJakarta().split("-").map(Number)
    const start = new Date(Date.UTC(year, month - 6, 1))
    return { year, month, startYear: start.getUTCFullYear(), startMonth: start.getUTCMonth() + 1 }
  })
  const [mode, setMode] = useState<Mode>("harian")
  const [year, setYear] = useState(initialDate.year)
  const [month, setMonth] = useState(initialDate.month)
  const [startYear, setStartYear] = useState(initialDate.startYear)
  const [startMonth, setStartMonth] = useState(initialDate.startMonth)
  const [endYear, setEndYear] = useState(initialDate.year)
  const [endMonth, setEndMonth] = useState(initialDate.month)
  const requestKey = [mode, year, month, startYear, startMonth, endYear, endMonth].join(":")
  const [result, setResult] = useState<{ key: string; data: ChartPoint[]; error?: string }>({ key: "", data: [] })

  useEffect(() => {
    let active = true
    fetchChartData(mode === "rentang"
      ? { mode, year, startYear, startMonth, endYear, endMonth }
      : { mode, year, month: mode === "harian" ? month : undefined })
      .then((response) => {
        if (active) setResult({ key: requestKey, data: response.data, error: response.error })
      })
      .catch(() => {
        if (active) setResult({ key: requestKey, data: [], error: "Gagal memuat data grafik" })
      })
    return () => { active = false }
  }, [mode, year, month, startYear, startMonth, endYear, endMonth, requestKey])

  const years = Array.from({ length: 5 }, (_, index) => initialDate.year - index)
  const loading = result.key !== requestKey
  const total = result.data.reduce((sum, point) => sum + point.pendapatanKotor, 0)
  const isEmpty = !loading && !result.error && result.data.every((point) => point.pendapatanKotor === 0)

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="font-bold text-slate-900">Tren pendapatan</h2><p className="mt-1 text-xs text-slate-500">Total periode: <strong className="text-slate-700 tabular-nums">{currency(total)}</strong></p></div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-700"><BarChart3 size={20} /></span>
        </div>

        <div className="mt-4 grid grid-cols-3 rounded-xl bg-slate-100 p-1" aria-label="Periode grafik">
          {([['harian','Harian'],['bulanan','Bulanan'],['rentang','Rentang']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={`min-h-10 rounded-lg px-2 text-xs font-semibold transition-colors sm:text-sm ${mode === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{label}</button>)}
        </div>

        <div className="mt-4 flex gap-3">
          {mode === "harian" && <><Select label="Bulan" value={month} onChange={setMonth}>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</Select><Select label="Tahun" value={year} onChange={setYear}>{years.map((option) => <option key={option}>{option}</option>)}</Select></>}
          {mode === "bulanan" && <Select label="Tahun laporan" value={year} onChange={setYear}>{years.map((option) => <option key={option}>{option}</option>)}</Select>}
          {mode === "rentang" && <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4"><Select label="Dari bulan" value={startMonth} onChange={setStartMonth}>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</Select><Select label="Tahun" value={startYear} onChange={setStartYear}>{years.map((option) => <option key={option}>{option}</option>)}</Select><Select label="Sampai bulan" value={endMonth} onChange={setEndMonth}>{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</Select><Select label="Tahun" value={endYear} onChange={setEndYear}>{years.map((option) => <option key={option}>{option}</option>)}</Select></div>}
        </div>
      </div>

      <div className={result.error ? "p-4 sm:p-5" : "relative min-h-72 p-2 pb-4 pt-4 sm:p-5"}>
        {result.error && <div className="px-2"><ErrorNotice message={result.error} /></div>}
        {!result.error && <ResponsiveContainer width="100%" height={280}>
          <LineChart data={result.data} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" interval={mode === "harian" ? 4 : 0} tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
            <YAxis width={58} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={shortCurrency} tickLine={false} axisLine={false} />
            <Tooltip formatter={(value) => currency(Number(value ?? 0))} contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Line type="monotone" dataKey="pendapatanKotor" name="Pendapatan kotor" stroke="#ca8a04" strokeWidth={2.5} dot={mode !== "harian"} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="pendapatanBersih" name="Bagian pemilik" stroke="#059669" strokeWidth={2.5} dot={mode !== "harian"} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>}
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/80"><span role="status" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600"><LoaderCircle size={18} className="animate-spin" /> Memuat grafik</span></div>}
        {isEmpty && <div className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-sm text-slate-500">Belum ada transaksi pada periode ini.</div>}
      </div>
    </section>
  )
}
