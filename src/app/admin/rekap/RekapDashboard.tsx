"use client"

import { useState, useEffect, useTransition, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  fetchRekap,
  deleteTransaksi,
  fetchJenisKendaraanAktif,
  fetchTransactionDateGroups,
  fetchTransactionsForDate,
  type RekapHarian,
  type TransaksiDetail,
  type TransactionDateGroup,
  type PaginatedDailyTransactions,
} from "./actions"
import {
  formatRupiah,
  formatTanggalSingkat,
  formatTanggalPanjang,
  todayWib,
  startOfWeekWib,
  startOfMonthWib,
} from "@/lib/formatters"
import { SummaryCard } from "./components/SummaryCard"
import { PaginationControls } from "./components/PaginationControls"
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal"
import { EditTransaksiModal } from "./components/EditTransaksiModal"
import { DailyTransactionsModal } from "./components/DailyTransactionsModal"
import { exportExcel, exportPdf } from "./utils/exportUtils"

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300 ${
      type === "success"
        ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
        : "bg-red-50/95 border-red-200 text-red-800"
    }`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
      </button>
    </div>
  )
} 

export function RekapDashboard({
  defaultDateFrom,
  defaultDateTo,
}: {
  defaultDateFrom: string
  defaultDateTo: string
}) {
  // Filter Ringkasan Harian / kartu statistik. Input tanggal tidak langsung
  // memuat ulang data; data baru diterapkan setelah tombol diterapkan ditekan.
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(defaultDateTo)
  const [appliedDateFrom, setAppliedDateFrom] = useState(defaultDateFrom)
  const [appliedDateTo, setAppliedDateTo] = useState(defaultDateTo)

  // Filter export sengaja dipisahkan dari filter dashboard. Mengubah periode
  // export tidak mengubah kartu statistik, Ringkasan Harian, atau Detail Transaksi.
  const [exportDateFrom, setExportDateFrom] = useState(defaultDateFrom)
  const [exportDateTo, setExportDateTo] = useState(defaultDateTo)
  const [harian, setHarian] = useState<RekapHarian[]>([])
  const [transactionGroups, setTransactionGroups] = useState<TransactionDateGroup[]>([])
  const [transactionGroupTotal, setTransactionGroupTotal] = useState(0)
  const [totals, setTotals] = useState({
    totalPendapatanKotor: 0,
    totalBagianKaryawan: 0,
    totalPendapatanBersih: 0,
    totalTransaksi: 0,
    rataRataPerHari: 0,
  })
  const [view, setView] = useState<"harian" | "detail">("harian")
  const PAGE_SIZE = 50
  const [pageHarian, setPageHarian] = useState(1)
  const [pageDetail, setPageDetail] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [selectedTanggalKey, setSelectedTanggalKey] = useState<string | null>(null)
  const [dailyTransactions, setDailyTransactions] = useState<PaginatedDailyTransactions | null>(null)
  const [dailyPage, setDailyPage] = useState(1)
  const [isDailyPending, startDailyTransition] = useTransition()
  const groupRequestId = useRef(0)
  const dailyRequestId = useRef(0)
  const [editTarget, setEditTarget] = useState<TransaksiDetail | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TransaksiDetail | null>(null)
  const [isDeletingPending, startDeleteTransition] = useTransition()
  const [jenisKendaraanList, setJenisKendaraanList] = useState<{ id: string; kategori: string; ukuran: string }[]>([])
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type })
  }
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [showMobileFilter, setShowMobileFilter] = useState(false)
  const [showMobileExport, setShowMobileExport] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(() => {
    setError(null)
    startTransition(async () => {
      const result = await fetchRekap({ dateFrom: appliedDateFrom, dateTo: appliedDateTo })
      if (result.error) {
        setError(result.error)
        return
      }
      setHarian(result.harian)
      setPageHarian(1)
      setPageDetail(1)
      setTotals({
        totalPendapatanKotor: result.totalPendapatanKotor,
        totalBagianKaryawan: result.totalBagianKaryawan,
        totalPendapatanBersih: result.totalPendapatanBersih,
        totalTransaksi: result.totalTransaksi,
        rataRataPerHari: result.rataRataPerHari,
      })
    })
  }, [appliedDateFrom, appliedDateTo])

  const loadTransactionGroups = useCallback(() => {
    const requestId = ++groupRequestId.current
    startTransition(async () => {
      const result = await fetchTransactionDateGroups({
        dateFrom: appliedDateFrom, dateTo: appliedDateTo, page: pageDetail, search: appliedSearch,
      })
      if (requestId !== groupRequestId.current) return
      if (result.error) {
        setError(result.error)
        setTransactionGroups([])
        setTransactionGroupTotal(0)
        return
      }
      setTransactionGroups(result.data)
      setTransactionGroupTotal(result.total)
    })
  }, [appliedDateFrom, appliedDateTo, pageDetail, appliedSearch])

  useEffect(() => {
    if (view === "detail") loadTransactionGroups()
  }, [view, loadTransactionGroups])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPageDetail(1)
      setAppliedSearch(searchQuery.trim())
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const loadDailyTransactions = useCallback((date: string, page: number) => {
    const requestId = ++dailyRequestId.current
    startDailyTransition(async () => {
      const result = await fetchTransactionsForDate({ date, page, search: appliedSearch })
      if (requestId !== dailyRequestId.current) return
      if (result.error) showToast(result.error, "error")
      setDailyTransactions(result)
    })
  }, [appliedSearch])

  useEffect(() => {
    if (selectedTanggalKey) loadDailyTransactions(selectedTanggalKey, dailyPage)
  }, [selectedTanggalKey, dailyPage, loadDailyTransactions])

  useEffect(() => {
    // Initial synchronization with server data; subsequent refreshes are explicit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  useEffect(() => {
    fetchJenisKendaraanAktif().then(setJenisKendaraanList)
  }, [])

  const rataRata = useMemo(() => {
    const n = harian.length || 1
    return {
      motorKecil: harian.reduce((a, h) => a + h.motorKecil, 0) / n,
      motorBesar: harian.reduce((a, h) => a + h.motorBesar, 0) / n,
      mobilKecil: harian.reduce((a, h) => a + h.mobilKecil, 0) / n,
      mobilSedang: harian.reduce((a, h) => a + h.mobilSedang, 0) / n,
      mobilBesar: harian.reduce((a, h) => a + h.mobilBesar, 0) / n,
      totalMotor: harian.reduce((a, h) => a + h.totalMotor, 0) / n,
      totalMobil: harian.reduce((a, h) => a + h.totalMobil, 0) / n,
      pendapatanKotor: harian.reduce((a, h) => a + h.pendapatanKotor, 0) / n,
      bagianKaryawan: harian.reduce((a, h) => a + h.bagianKaryawan, 0) / n,
      pendapatanBersih: harian.reduce((a, h) => a + h.pendapatanBersih, 0) / n,
    }
  }, [harian])

  const totalKolom = useMemo(
    () => ({
      motorKecil: harian.reduce((a, h) => a + h.motorKecil, 0),
      motorBesar: harian.reduce((a, h) => a + h.motorBesar, 0),
      mobilKecil: harian.reduce((a, h) => a + h.mobilKecil, 0),
      mobilSedang: harian.reduce((a, h) => a + h.mobilSedang, 0),
      mobilBesar: harian.reduce((a, h) => a + h.mobilBesar, 0),
      totalMotor: harian.reduce((a, h) => a + h.totalMotor, 0),
      totalMobil: harian.reduce((a, h) => a + h.totalMobil, 0),
      pendapatanKotor: harian.reduce((a, h) => a + h.pendapatanKotor, 0),
      bagianKaryawan: harian.reduce((a, h) => a + h.bagianKaryawan, 0),
      pendapatanBersih: harian.reduce((a, h) => a + h.pendapatanBersih, 0),
    }),
    [harian]
  )

  const harianPaged = useMemo(
    () => harian.slice((pageHarian - 1) * PAGE_SIZE, pageHarian * PAGE_SIZE),
    [harian, pageHarian]
  )

  function handleApplySummaryFilter() {
    if (!dateFrom || !dateTo) {
      showToast("Pilih tanggal mulai dan tanggal akhir", "error")
      return
    }

    if (dateFrom > dateTo) {
      showToast("Tanggal mulai tidak boleh melebihi tanggal akhir", "error")
      return
    }

    setAppliedDateFrom(dateFrom)
    setAppliedDateTo(dateTo)
    setPageDetail(1)
    setSelectedTanggalKey(null)
    setDailyTransactions(null)
    setShowMobileFilter(false)
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  // Preset tanggal cepat, selalu dihitung dari kalender WIB (bukan tanggal
  // browser/device admin) dan langsung diterapkan tanpa perlu klik "Terapkan".
  function applyPreset(preset: "hari-ini" | "minggu-ini" | "bulan-ini") {
    const today = todayWib()
    let from = today
    const to = today

    if (preset === "minggu-ini") {
      from = startOfWeekWib(today)
    } else if (preset === "bulan-ini") {
      from = startOfMonthWib(today)
    }

    setDateFrom(from)
    setDateTo(to)
    setAppliedDateFrom(from)
    setAppliedDateTo(to)
    setPageDetail(1)
    setSelectedTanggalKey(null)
    setDailyTransactions(null)
    setShowMobileFilter(false)
  }

  function handleResetExportFilter() {
    setExportDateFrom(defaultDateFrom)
    setExportDateTo(defaultDateTo)
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    startDeleteTransition(async () => {
      const result = await deleteTransaksi(deleteTarget.id)
      if (result.error) {
        showToast(result.error, "error")
      } else {
        showToast("Transaksi berhasil dihapus", "success")
        loadData()
        loadTransactionGroups()
        if (selectedTanggalKey) loadDailyTransactions(selectedTanggalKey, dailyPage)
      }
      setDeleteTarget(null)
    })
  }

  async function handleExportExcel() {
    if (!exportDateFrom || !exportDateTo) {
      showToast("Pilih periode export terlebih dahulu", "error")
      return
    }
    if (exportDateFrom > exportDateTo) {
      showToast("Tanggal mulai export tidak boleh melebihi tanggal akhir", "error")
      return
    }

    setExportingExcel(true)
    try {
      // Export mengambil data sendiri berdasarkan filter export. Jadi periode
      // export benar-benar independen dari filter Ringkasan Harian.
      const exportResult = await fetchRekap({ dateFrom: exportDateFrom, dateTo: exportDateTo })
      if (exportResult.error) {
        showToast(exportResult.error, "error")
        return
      }
      if (exportResult.harian.length === 0) {
        showToast("Tidak ada data pada periode export", "error")
        return
      }

      await exportExcel({ harian: exportResult.harian, dateFrom: exportDateFrom, dateTo: exportDateTo })
      showToast(`Excel berhasil dibuat untuk ${exportDateFrom} s/d ${exportDateTo}`, "success")
    } finally {
      setExportingExcel(false)
    }
  }

  async function handleExportPdf() {
    if (!exportDateFrom || !exportDateTo) {
      showToast("Pilih periode export terlebih dahulu", "error")
      return
    }
    if (exportDateFrom > exportDateTo) {
      showToast("Tanggal mulai export tidak boleh melebihi tanggal akhir", "error")
      return
    }

    setExportingPdf(true)
    try {
      const exportResult = await fetchRekap({ dateFrom: exportDateFrom, dateTo: exportDateTo })
      if (exportResult.error) {
        showToast(exportResult.error, "error")
        return
      }
      if (exportResult.harian.length === 0) {
        showToast("Tidak ada data pada periode export", "error")
        return
      }

      await exportPdf({
        harian: exportResult.harian,
        dateFrom: exportDateFrom,
        dateTo: exportDateTo,
        totalPendapatanKotor: exportResult.totalPendapatanKotor,
        totalTransaksi: exportResult.totalTransaksi,
        totalBagianKaryawan: exportResult.totalBagianKaryawan,
        totalPendapatanBersih: exportResult.totalPendapatanBersih,
      })
      showToast(`PDF berhasil dibuat untuk ${exportDateFrom} s/d ${exportDateTo}`, "success")
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="md:hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Periode aktif</p>
        <p className="mt-1 text-sm font-bold text-slate-900">
          {formatTanggalPanjang(appliedDateFrom)} – {formatTanggalPanjang(appliedDateTo)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button className="h-11" onClick={() => setShowMobileFilter(true)}>Filter Data</Button>
          <Button variant="outline" className="h-11" onClick={() => setShowMobileExport(true)}>Export</Button>
        </div>
      </div>

      {(showMobileFilter || showMobileExport) && (
        <button
          type="button"
          aria-label="Tutup panel"
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
          onClick={() => { setShowMobileFilter(false); setShowMobileExport(false) }}
        />
      )}

      {/* Filter Ringkasan + Export dipisahkan supaya masing-masing punya periode sendiri. */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={`${showMobileFilter ? "fixed inset-x-3 bottom-3 z-50 block max-h-[85vh] overflow-y-auto rounded-2xl" : "hidden"} md:static md:block md:max-h-none md:overflow-visible bg-white rounded-xl border border-slate-200/80 shadow-xl md:shadow-sm p-5`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Filter Ringkasan</h2>
              <p className="text-xs text-slate-500 mt-0.5">Mengatur kartu statistik, Ringkasan Harian, dan Detail Transaksi.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full whitespace-nowrap">WIB</span>
              <button type="button" onClick={() => setShowMobileFilter(false)} className="md:hidden h-9 w-9 rounded-lg bg-slate-100 text-slate-600" aria-label="Tutup filter">×</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => applyPreset("hari-ini")}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-yellow-300 hover:text-yellow-700 hover:bg-yellow-50 transition-colors"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset("minggu-ini")}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-yellow-300 hover:text-yellow-700 hover:bg-yellow-50 transition-colors"
            >
              Minggu Ini
            </button>
            <button
              type="button"
              onClick={() => applyPreset("bulan-ini")}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-yellow-300 hover:text-yellow-700 hover:bg-yellow-50 transition-colors"
            >
              Bulan Ini
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-slate-600">Dari Tanggal</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-slate-600">Sampai Tanggal</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10" />
            </div>
            <Button onClick={handleApplySummaryFilter} disabled={isPending} className="h-11 md:h-10 w-full md:w-auto">
              {isPending ? "Memuat..." : "Terapkan"}
            </Button>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Periode aktif: <span className="font-medium text-slate-600">{formatTanggalPanjang(appliedDateFrom)} - {formatTanggalPanjang(appliedDateTo)}</span>
          </p>
        </div>

        <div className={`${showMobileExport ? "fixed inset-x-3 bottom-3 z-50 block max-h-[85vh] overflow-y-auto rounded-2xl" : "hidden"} md:static md:block md:max-h-none md:overflow-visible bg-white rounded-xl border border-slate-200/80 shadow-xl md:shadow-sm p-5`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Export Laporan</h2>
              <p className="text-xs text-slate-500 mt-0.5">Periode export tidak memengaruhi data dashboard.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap">Terpisah</span>
              <button type="button" onClick={() => setShowMobileExport(false)} className="md:hidden h-9 w-9 rounded-lg bg-slate-100 text-slate-600" aria-label="Tutup export">×</button>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-slate-600">Dari Tanggal</label>
              <Input type="date" value={exportDateFrom} onChange={(e) => setExportDateFrom(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-slate-600">Sampai Tanggal</label>
              <Input type="date" value={exportDateTo} onChange={(e) => setExportDateTo(e.target.value)} className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={handleExportExcel} disabled={exportingExcel} className="h-11 md:h-10">
                {exportingExcel ? "Menyiapkan..." : "Excel"}
              </Button>
              <Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf} className="h-11 md:h-10">
                {exportingPdf ? "Menyiapkan..." : "PDF"}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-[11px] text-slate-400">Pilih periode khusus file yang akan diunduh.</p>
            <button type="button" onClick={handleResetExportFilter} className="text-[11px] font-medium text-yellow-600 hover:text-yellow-700">Reset</button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">{error}</div>
      )}

      {/* Summary cards */}
      <div ref={resultsRef} className="grid scroll-mt-20 grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <SummaryCard label="Pendapatan Kotor" value={formatRupiah(totals.totalPendapatanKotor)} accent="slate" />
        <SummaryCard label="Pendapatan Bersih" value={formatRupiah(totals.totalPendapatanBersih)} accent="indigo" />
        <SummaryCard label="Total Transaksi" value={totals.totalTransaksi.toString()} accent="emerald" />
        <SummaryCard label="Rata-rata / Hari" value={formatRupiah(Math.round(totals.rataRataPerHari))} accent="slate" />
      </div>

      {/* Toggle view + Search untuk Detail */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 bg-slate-50/95 px-1 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:p-0">
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button
            onClick={() => setView("harian")}
            className={`min-h-11 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              view === "harian" ? "bg-yellow-400 text-slate-900" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            Ringkasan Harian
          </button>
          <button
            onClick={() => setView("detail")}
            className={`min-h-11 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              view === "detail" ? "bg-yellow-400 text-slate-900" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            Detail Transaksi
          </button>
        </div>

        {view === "detail" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-[340px]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari plat, kasir, jenis, atau tanggal..."
                className="pl-9 pr-9 h-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  aria-label="Hapus pencarian"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <span className="hidden sm:inline text-xs text-slate-400 whitespace-nowrap">
              {transactionGroupTotal} tanggal
            </span>
          </div>
        )}
      </div>

      {view === "detail" && (
        <p className="-mt-3 text-xs text-slate-400">
          Pencarian menemukan tanggal yang memiliki transaksi sesuai kata kunci. Modal mempertahankan konteks pencarian yang sedang aktif.
        </p>
      )}

      {/* Tabel Ringkasan Harian */}
      {view === "harian" && (
        <>
        <div className="space-y-3 md:hidden">
          {harianPaged.map((h) => (
            <article key={h.tanggal} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="font-bold text-slate-900">{formatTanggalPanjang(h.tanggal)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{h.hari} · {h.totalMotor + h.totalMobil} kendaraan</p>
                </div>
                <span className="rounded-lg bg-yellow-50 px-2.5 py-1 text-xs font-bold text-yellow-700">{formatRupiah(h.pendapatanKotor)}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt className="text-xs text-slate-500">Motor</dt><dd className="font-bold text-slate-800">{h.totalMotor}</dd></div>
                <div><dt className="text-xs text-slate-500">Mobil</dt><dd className="font-bold text-slate-800">{h.totalMobil}</dd></div>
                <div><dt className="text-xs text-slate-500">Bagian karyawan</dt><dd className="font-semibold text-amber-600">{formatRupiah(h.bagianKaryawan)}</dd></div>
                <div><dt className="text-xs text-slate-500">Pendapatan bersih</dt><dd className="font-semibold text-emerald-600">{formatRupiah(h.pendapatanBersih)}</dd></div>
              </dl>
            </article>
          ))}
          {harian.length === 0 && !isPending && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">Tidak ada data untuk periode ini</div>}
          <PaginationControls page={pageHarian} totalItems={harian.length} pageSize={PAGE_SIZE} onPageChange={setPageHarian} />
        </div>
        <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Hari</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Motor Kecil</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Motor Besar</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Mobil Kecil</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Mobil Sedang</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Mobil Besar</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Total Motor</th>
                <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Total Mobil</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Kotor</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Karyawan</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {harianPaged.map((h) => (
                <tr key={h.tanggal} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 whitespace-nowrap font-medium text-slate-900">{formatTanggalSingkat(h.tanggal)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{h.hari}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{h.motorKecil}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{h.motorBesar}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{h.mobilKecil}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{h.mobilSedang}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{h.mobilBesar}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{h.totalMotor}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{h.totalMobil}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-900">{formatRupiah(h.pendapatanKotor)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-600">{formatRupiah(h.bagianKaryawan)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600 font-medium">{formatRupiah(h.pendapatanBersih)}</td>
                </tr>
              ))}
              {harian.length === 0 && !isPending && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-400">Tidak ada data untuk periode ini</td>
                </tr>
              )}
            </tbody>
            {harian.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                  <td className="px-4 py-3" colSpan={2}>TOTAL</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totalKolom.motorKecil}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totalKolom.motorBesar}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totalKolom.mobilKecil}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totalKolom.mobilSedang}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totalKolom.mobilBesar}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totalKolom.totalMotor}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totalKolom.totalMobil}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(totalKolom.pendapatanKotor)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-600">{formatRupiah(totalKolom.bagianKaryawan)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-600">{formatRupiah(totalKolom.pendapatanBersih)}</td>
                </tr>
                <tr className="bg-slate-50/60 text-slate-500 text-xs">
                  <td className="px-4 py-2" colSpan={2}>RATA-RATA / HARI</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rataRata.motorKecil.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rataRata.motorBesar.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rataRata.mobilKecil.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rataRata.mobilSedang.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rataRata.mobilBesar.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rataRata.totalMotor.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{rataRata.totalMobil.toFixed(1)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatRupiah(Math.round(rataRata.pendapatanKotor))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatRupiah(Math.round(rataRata.bagianKaryawan))}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatRupiah(Math.round(rataRata.pendapatanBersih))}</td>
                </tr>
              </tfoot>
            )}
          </table>
          <PaginationControls
            page={pageHarian}
            totalItems={harian.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPageHarian}
          />
        </div>
        </>
      )}

      {/* Tabel Detail Transaksi - 1 baris per tanggal */}
      {view === "detail" && (
        <>
        <div className="space-y-3 md:hidden">
          {transactionGroups.map((group) => (
            <button
              key={group.tanggalKey}
              type="button"
              onClick={() => { setDailyPage(1); setDailyTransactions(null); setSelectedTanggalKey(group.tanggalKey) }}
              className="block w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm active:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="font-bold text-slate-900">{formatTanggalPanjang(`${group.tanggalKey}T00:00:00+07:00`)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{group.totalTransaksi} transaksi</p>
                </div>
                <span className="text-xl text-slate-400">›</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div><p className="text-[11px] text-slate-500">Kotor</p><p className="mt-0.5 text-xs font-bold text-slate-900">{formatRupiah(group.pendapatanKotor)}</p></div>
                <div><p className="text-[11px] text-slate-500">Karyawan</p><p className="mt-0.5 text-xs font-bold text-amber-600">{formatRupiah(group.bagianKaryawan)}</p></div>
                <div><p className="text-[11px] text-slate-500">Bersih</p><p className="mt-0.5 text-xs font-bold text-emerald-600">{formatRupiah(group.pendapatanBersih)}</p></div>
              </div>
            </button>
          ))}
          {transactionGroups.length === 0 && !isPending && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">{searchQuery ? "Tidak ada hasil yang cocok" : "Tidak ada transaksi untuk periode ini"}</div>}
          <PaginationControls page={pageDetail} totalItems={transactionGroupTotal} pageSize={PAGE_SIZE} onPageChange={setPageDetail} />
        </div>
        <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Transaksi</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Kotor</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Karyawan</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Bersih</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactionGroups.map((group) => (
                <tr
                  key={group.tanggalKey}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => { setDailyPage(1); setDailyTransactions(null); setSelectedTanggalKey(group.tanggalKey) }}
                      className="text-left font-semibold text-slate-900 hover:text-yellow-600 transition-colors"
                      title="Lihat semua transaksi pada tanggal ini"
                    >
                      {formatTanggalPanjang(`${group.tanggalKey}T00:00:00+07:00`)}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-700">
                    {group.totalTransaksi}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                    {formatRupiah(group.pendapatanKotor)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-600">
                    {formatRupiah(group.bagianKaryawan)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-600 font-medium">
                    {formatRupiah(group.pendapatanBersih)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => { setDailyPage(1); setDailyTransactions(null); setSelectedTanggalKey(group.tanggalKey) }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-yellow-600 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                    >
                      Lihat transaksi
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {transactionGroups.length === 0 && !isPending && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    {searchQuery ? "Tidak ada hasil yang cocok" : "Tidak ada transaksi untuk periode ini"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <PaginationControls
            page={pageDetail}
            totalItems={transactionGroupTotal}
            pageSize={PAGE_SIZE}
            onPageChange={setPageDetail}
          />
        </div>
        </>
      )}

      {selectedTanggalKey && (
        <DailyTransactionsModal
          tanggalKey={selectedTanggalKey}
          result={dailyTransactions}
          isPending={isDailyPending}
          onPageChange={setDailyPage}
          onClose={() => { dailyRequestId.current += 1; setSelectedTanggalKey(null); setDailyTransactions(null) }}
          onEdit={(transaksi) => setEditTarget(transaksi)}
          onDelete={(transaksi) => setDeleteTarget(transaksi)}
        />
      )}

      {editTarget && (
        <EditTransaksiModal
          transaksi={editTarget}
          jenisKendaraanList={jenisKendaraanList}
          onCancel={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null)
            loadData()
            loadTransactionGroups()
            if (selectedTanggalKey) loadDailyTransactions(selectedTanggalKey, dailyPage)
          }}
          onResult={showToast}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          transaksi={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          isPending={isDeletingPending}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
