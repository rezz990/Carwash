"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { fetchTransaksi, type TransaksiRow, type FetchTransaksiResult } from "./actions"

type JenisKendaraanOption = {
  id: string
  kategori: string
  ukuran: string
}

const PAGE_SIZE = 20

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatTanggal(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

function formatWaktu(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
}

// Skeleton loader row
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3.5"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-12 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
      <td className="px-4 py-3.5 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto" /></td>
    </tr>
  )
}

export function RekapTable({
  jenisKendaraanOptions,
  initialData,
}: {
  jenisKendaraanOptions: JenisKendaraanOption[]
  initialData: FetchTransaksiResult
}) {
  const [data, setData] = useState<TransaksiRow[]>(initialData.data)
  const [totalCount, setTotalCount] = useState(initialData.totalCount)
  const [totalPendapatan, setTotalPendapatan] = useState(initialData.totalPendapatan)
  const [page, setPage] = useState(1)
  const [isPending, startTransition] = useTransition()

  // Filters
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [jenisFilter, setJenisFilter] = useState("")

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const loadData = useCallback((targetPage: number, df: string, dt: string, jf: string) => {
    startTransition(async () => {
      const result = await fetchTransaksi({
        page: targetPage,
        dateFrom: df || undefined,
        dateTo: dt || undefined,
        jenisKendaraanId: jf || undefined,
      })
      setData(result.data)
      setTotalCount(result.totalCount)
      setTotalPendapatan(result.totalPendapatan)
      setPage(targetPage)
    })
  }, [])

  // Refetch saat filter berubah (reset ke page 1)
  const applyFilters = () => {
    loadData(1, dateFrom, dateTo, jenisFilter)
  }

  const clearFilters = () => {
    setDateFrom("")
    setDateTo("")
    setJenisFilter("")
    loadData(1, "", "", "")
  }

  const hasActiveFilter = dateFrom || dateTo || jenisFilter

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/30 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <h3 className="text-sm font-semibold text-slate-700">Filter</h3>
          {hasActiveFilter && (
            <button onClick={clearFilters} className="ml-auto text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              Reset filter
            </button>
          )}
        </div>
        <div className="p-5 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dari Tanggal</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sampai Tanggal</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Jenis Kendaraan</label>
            <select
              value={jenisFilter}
              onChange={(e) => setJenisFilter(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 transition-all duration-200 appearance-none cursor-pointer"
            >
              <option value="">Semua</option>
              {jenisKendaraanOptions.map((jk) => (
                <option key={jk.id} value={jk.id}>
                  {jk.kategori} {jk.ukuran}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={applyFilters} disabled={isPending} className="h-10 px-6">
              {isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Terapkan"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Transaksi</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
              {isPending ? "..." : totalCount.toLocaleString("id-ID")}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Pendapatan</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
              {isPending ? "..." : formatRupiah(totalPendapatan)}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200/60">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Kendaraan</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Plat Nomor</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tarif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isPending ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                      </div>
                      <p className="text-slate-400 font-medium">Tidak ada data transaksi</p>
                      {hasActiveFilter && (
                        <p className="text-xs text-slate-400">Coba ubah filter untuk melihat hasil lain</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                      {formatTanggal(row.tanggal_waktu)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {formatWaktu(row.tanggal_waktu)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        row.jenis_kendaraan?.kategori === "Motor"
                          ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                          : "bg-sky-50 text-sky-700 border border-sky-200/60"
                      }`}>
                        {row.jenis_kendaraan?.kategori} {row.jenis_kendaraan?.ukuran}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-mono tracking-wider uppercase">
                      {row.plat_nomor || <span className="text-slate-300 font-sans normal-case tracking-normal">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatRupiah(row.tarif_total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Menampilkan <span className="font-semibold text-slate-700">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)}</span> dari <span className="font-semibold text-slate-700">{totalCount}</span> transaksi
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isPending}
                onClick={() => loadData(page - 1, dateFrom, dateTo, jenisFilter)}
                className="h-8 w-8 p-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </Button>
              
              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1]) > 1) acc.push("...")
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 text-xs">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => loadData(p, dateFrom, dateTo, jenisFilter)}
                      disabled={isPending}
                      className={`h-8 w-8 p-0 text-xs ${p === page ? "" : "text-slate-600"}`}
                    >
                      {p}
                    </Button>
                  )
                )}

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isPending}
                onClick={() => loadData(page + 1, dateFrom, dateTo, jenisFilter)}
                className="h-8 w-8 p-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
