"use client"

import { useState, useEffect, useTransition, useMemo } from "react"
import { fetchChartData, type ChartPoint } from "./actions"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatRupiahSingkat(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return value.toString()
}

const BULAN_NAMA = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

type Mode = "harian" | "bulanan" | "rentang"

export function OverviewChart() {
  const now = new Date()
  const [mode, setMode] = useState<Mode>("harian")

  // State untuk mode "harian" & "bulanan"
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1) // 1-12

  // State untuk mode "rentang" - default: 5 bulan ke belakang sampai bulan ini
  const [startYear, setStartYear] = useState(now.getFullYear())
  const [startMonth, setStartMonth] = useState(Math.max(1, now.getMonth() + 1 - 5))
  const [endYear, setEndYear] = useState(now.getFullYear())
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1)

  const [data, setData] = useState<ChartPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Range tahun untuk dropdown: 3 tahun ke belakang sampai tahun sekarang
  const yearOptions = useMemo(() => {
    const years = []
    for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) years.push(y)
    return years
  }, [now])

  useEffect(() => {
    setError(null)
    startTransition(async () => {
      const result = await fetchChartData(
        mode === "rentang"
          ? { mode, year, startYear, startMonth, endYear, endMonth }
          : { mode, year, month: mode === "harian" ? month : undefined }
      )
      if (result.error) {
        setError(result.error)
        setData([])
      } else {
        setData(result.data)
      }
    })
  }, [mode, year, month, startYear, startMonth, endYear, endMonth])

  const totalPeriode = data.reduce((acc, d) => acc + d.pendapatanKotor, 0)
  const showDots = mode !== "harian" // titik data cuma ditampilin kalau bukan per-hari (biar ga penuh)

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700">Tren Pendapatan</h3>
            <p className="text-xs text-slate-400 mt-0.5">Total periode ini: {formatRupiah(totalPeriode)}</p>
          </div>

          {/* Toggle mode */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setMode("harian")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === "harian" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Per Hari
            </button>
            <button
              onClick={() => setMode("bulanan")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === "bulanan" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Per Bulan (1 Tahun)
            </button>
            <button
              onClick={() => setMode("rentang")}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === "rentang" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Rentang Bebas
            </button>
          </div>
        </div>

        {/* Kontrol filter, berbeda tergantung mode */}
        <div className="flex flex-wrap items-center gap-2">
          {mode === "harian" && (
            <>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                {BULAN_NAMA.map((nama, idx) => (
                  <option key={idx} value={idx + 1}>{nama}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}

          {mode === "bulanan" && (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          {mode === "rentang" && (
            <>
              <span className="text-xs text-slate-500 font-medium">Dari</span>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number(e.target.value))}
                className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                {BULAN_NAMA.map((nama, idx) => (
                  <option key={idx} value={idx + 1}>{nama}</option>
                ))}
              </select>
              <select
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <span className="text-xs text-slate-500 font-medium ml-1">Sampai</span>
              <select
                value={endMonth}
                onChange={(e) => setEndMonth(Number(e.target.value))}
                className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                {BULAN_NAMA.map((nama, idx) => (
                  <option key={idx} value={idx + 1}>{nama}</option>
                ))}
              </select>
              <select
                value={endYear}
                onChange={(e) => setEndYear(Number(e.target.value))}
                className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl mb-4">{error}</div>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={mode === "rentang" ? -20 : 0} textAnchor={mode === "rentang" ? "end" : "middle"} height={mode === "rentang" ? 45 : 30} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatRupiahSingkat} />
          <Tooltip formatter={(value) => formatRupiah(Number(value ?? 0))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="pendapatanKotor" name="Pendapatan Kotor" stroke="#6366f1" strokeWidth={2} dot={showDots} />
          <Line type="monotone" dataKey="pendapatanBersih" name="Pendapatan Bersih" stroke="#10b981" strokeWidth={2} dot={showDots} />
        </LineChart>
      </ResponsiveContainer>

      {isPending && (
        <p className="text-xs text-slate-400 text-center mt-2">Memuat...</p>
      )}
    </div>
  )
}