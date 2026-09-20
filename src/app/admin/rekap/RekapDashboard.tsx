"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarDays, ChevronRight, Download, RefreshCw, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { DateRangeFields } from "@/components/ui/DateRangeFields"
import { EmptyState, ErrorNotice, LoadingState } from "@/components/ui/Feedback"
import { useToast } from "@/components/toast/ToastProvider"
import { useRealtimeRekap } from "@/hooks/useRealtimeRekap"
import { formatRupiah, formatTanggalPanjang, startOfMonthWib, startOfWeekWib, todayWib } from "@/lib/formatters"
import { fetchRekap, fetchTransactionDateGroups, fetchTransactionsForDate, fetchJenisKendaraanAktif, deleteTransaksi, type RekapResult, type PaginatedTransactionGroups, type PaginatedDailyTransactions, type TransaksiDetail } from "./actions"
import { SummaryCard } from "./components/SummaryCard"
import { PaginationControls } from "./components/PaginationControls"
import { DailyTransactionsModal } from "./components/DailyTransactionsModal"
import { EditTransaksiModal } from "./components/EditTransaksiModal"
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal"
import { exportExcel, exportPdf } from "./utils/exportUtils"

type Result<T> = { key: string; data?: T; error?: string }
const PAGE_SIZE = 10

export function RekapDashboard({ defaultDateFrom, defaultDateTo }: { defaultDateFrom: string; defaultDateTo: string }) {
  const { addToast } = useToast()
  const [period, setPeriod] = useState({ from: defaultDateFrom, to: defaultDateTo })
  const [draft, setDraft] = useState(period)
  const [exportPeriod, setExportPeriod] = useState(period)
  const [panel, setPanel] = useState<"filter" | "export" | null>(null)
  const [filterError, setFilterError] = useState("")
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null)
  const [revision, setRevision] = useState(0)
  const [view, setView] = useState<"harian" | "detail">("harian")
  const [page, setPage] = useState(1)
  const [groupPage, setGroupPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchValue, setSearchValue] = useState("")
  const [summary, setSummary] = useState<Result<RekapResult>>()
  const [groups, setGroups] = useState<Result<PaginatedTransactionGroups>>()
  const [day, setDay] = useState<string | null>(null)
  const [dayPage, setDayPage] = useState(1)
  const [dayData, setDayData] = useState<Result<PaginatedDailyTransactions>>()
  const [editTarget, setEditTarget] = useState<TransaksiDetail | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TransaksiDetail | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [vehicles, setVehicles] = useState<{ id: string; kategori: string; ukuran: string }[]>([])
  const summaryKey = `${period.from}/${period.to}/${revision}`
  const groupKey = `${summaryKey}/${groupPage}/${searchValue}`
  const dayKey = `${day}/${dayPage}/${searchValue}/${revision}`
  const data = summary?.key === summaryKey ? summary.data : undefined
  const summaryError = summary?.key === summaryKey ? summary.error : undefined
  const groupResult = groups?.key === groupKey ? groups.data : undefined
  const groupError = groups?.key === groupKey ? groups.error : undefined
  const dailyResult = dayData?.key === dayKey ? dayData.data : undefined
  const dailyError = dayData?.key === dayKey ? dayData.error : undefined
  const refresh = useCallback(() => setRevision(value => value + 1), [])
  useRealtimeRekap(refresh)

  useEffect(() => {
    let active = true
    fetchRekap({ dateFrom: period.from, dateTo: period.to })
      .then(result => { if (active) setSummary({ key: summaryKey, data: result.error ? undefined : result, error: result.error }) })
      .catch(() => { if (active) setSummary({ key: summaryKey, error: "Rekap belum berhasil dimuat. Periksa koneksi lalu coba lagi." }) })
    return () => { active = false }
  }, [period.from, period.to, summaryKey])

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearchValue(search.trim()); setGroupPage(1); setDayPage(1) }, 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (view !== "detail") return
    let active = true
    fetchTransactionDateGroups({ dateFrom: period.from, dateTo: period.to, page: groupPage, search: searchValue })
      .then(result => { if (active) setGroups({ key: groupKey, data: result.error ? undefined : result, error: result.error }) })
      .catch(() => { if (active) setGroups({ key: groupKey, error: "Daftar tanggal belum berhasil dimuat." }) })
    return () => { active = false }
  }, [view, period.from, period.to, groupPage, searchValue, groupKey])

  useEffect(() => {
    if (!day) return
    let active = true
    fetchTransactionsForDate({ date: day, page: dayPage, search: view === "detail" ? searchValue : "" })
      .then(result => { if (active) setDayData({ key: dayKey, data: result.error ? undefined : result, error: result.error }) })
      .catch(() => { if (active) setDayData({ key: dayKey, error: "Transaksi harian belum berhasil dimuat." }) })
    return () => { active = false }
  }, [day, dayPage, searchValue, view, dayKey])

  useEffect(() => { fetchJenisKendaraanAktif().then(setVehicles).catch(() => setVehicles([])) }, [])

  function apply(from: string, to: string) {
    if (!from || !to || from > to) { setFilterError("Pilih tanggal mulai dan akhir yang valid."); return }
    setPeriod({ from, to }); setDraft({ from, to }); setPage(1); setGroupPage(1); setDay(null); setPanel(null); setFilterError("")
  }
  function openDay(date: string) { setDay(date); setDayPage(1) }
  async function remove() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      const result = await deleteTransaksi(deleteTarget.id)
      if (result.error) addToast(result.error, "error")
      else { addToast("Transaksi berhasil dihapus", "success"); setDeleteTarget(null); refresh() }
    } catch { addToast("Penghapusan belum berhasil. Coba lagi.", "error") }
    finally { setDeleting(false) }
  }
  async function download(format: "excel" | "pdf") {
    if (exporting) return
    const { from, to } = exportPeriod
    if (!from || !to || from > to) { setFilterError("Pilih periode ekspor yang valid."); return }
    setExporting(format); setFilterError("")
    try {
      const report = await fetchRekap({ dateFrom: from, dateTo: to })
      if (report.error) { setFilterError(report.error); return }
      if (!report.harian.length) { setFilterError("Belum ada transaksi untuk periode ekspor ini."); return }
      if (format === "excel") await exportExcel({ harian: report.harian, dateFrom: from, dateTo: to })
      else await exportPdf({ ...report, dateFrom: from, dateTo: to })
      addToast(`Laporan ${format.toUpperCase()} siap diunduh`, "success"); setPanel(null)
    } catch { setFilterError("Laporan gagal dibuat. Periksa koneksi dan coba lagi.") }
    finally { setExporting(null) }
  }
  const presets = [{ label: "Hari ini", from: todayWib() }, { label: "Minggu ini", from: startOfWeekWib(todayWib()) }, { label: "Bulan ini", from: startOfMonthWib(todayWib()) }]
  const days = [...(data?.harian ?? [])].reverse()
  const pageDays = days.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const rangeLabel = period.from === period.to ? formatTanggalPanjang(period.from) : `${formatTanggalPanjang(period.from)} – ${formatTanggalPanjang(period.to)}`

  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-label="Periode rekap">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-xs font-medium text-slate-500">Periode aktif · WIB</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-900"><CalendarDays size={17} className="shrink-0" />{rangeLabel}</p></div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" className="flex-1 gap-2 sm:flex-none" onClick={() => { setDraft(period); setFilterError(""); setPanel("filter") }}><SlidersHorizontal size={16} />Filter</Button>
          <Button variant="outline" className="flex-1 gap-2 sm:flex-none" onClick={() => { setExportPeriod(period); setFilterError(""); setPanel("export") }}><Download size={16} />Ekspor</Button>
          <Button variant="ghost" size="icon" onClick={refresh} aria-label="Muat ulang rekap" disabled={!data && !summaryError}><RefreshCw size={17} /></Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:flex" aria-label="Pilihan periode cepat">
        {presets.map(preset => <button key={preset.label} type="button" aria-pressed={period.from === preset.from && period.to === todayWib()}
          onClick={() => apply(preset.from, todayWib())} className="min-h-11 rounded-xl border border-slate-200 px-2 text-xs font-semibold text-slate-600 aria-pressed:border-yellow-400 aria-pressed:bg-yellow-400 aria-pressed:text-slate-900 sm:px-4 sm:text-sm">{preset.label}</button>)}
      </div>
    </section>

    {summaryError ? <ErrorNotice message={summaryError} onRetry={refresh} /> : !data ? <LoadingState label="Memuat rekap periode ini…" /> : <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-live="polite">
      <SummaryCard label="Pendapatan kotor" value={formatRupiah(data.totalPendapatanKotor)} accent="slate" />
      <SummaryCard label="Bagian pemilik" value={formatRupiah(data.totalPendapatanBersih)} accent="indigo" />
      <SummaryCard label="Total transaksi" value={String(data.totalTransaksi)} accent="slate" />
      <SummaryCard label="Bagian karyawan" value={formatRupiah(data.totalBagianKaryawan)} accent="slate" />
    </div>}
    {data && <p className="text-xs text-slate-500">Rata-rata per hari dengan transaksi: <strong className="font-medium text-slate-700">{formatRupiah(Math.round(data.rataRataPerHari))}</strong></p>}

    <div className="sticky top-0 z-10 -mx-1 rounded-xl bg-slate-50/95 px-1 py-2 backdrop-blur-sm">
      <div className="grid grid-cols-2 gap-2 sm:w-fit" aria-label="Tampilan rekap">{([['harian', 'Ringkasan harian'], ['detail', 'Detail transaksi']] as const).map(([value, label]) =>
        <button key={value} type="button" aria-pressed={view === value} onClick={() => setView(value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 aria-pressed:border-yellow-400 aria-pressed:bg-yellow-400 aria-pressed:text-slate-900">{label}</button>)}</div>
      {view === "detail" && <div className="relative mt-3"><Search size={18} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" /><Input aria-label="Cari transaksi" placeholder="Cari plat, kasir, atau kendaraan…" value={search} onChange={event => setSearch(event.target.value)} className="pl-10" /></div>}
    </div>

    {view === "harian" && data && <>
      {days.length === 0 ? <EmptyState title="Belum ada transaksi" description="Coba pilih periode lain untuk melihat rekap." /> : <>
        <PaginationControls page={page} totalItems={days.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
        <div className="space-y-3 md:hidden">{pageDays.map(h => <article key={h.tanggal} className="rounded-2xl border border-slate-200 bg-white p-4">
          <button type="button" onClick={() => openDay(h.tanggal)} className="flex min-h-11 w-full items-start justify-between gap-3 text-left" aria-label={`Lihat transaksi ${formatTanggalPanjang(h.tanggal)}`}>
            <span><span className="block text-sm font-semibold text-slate-900">{formatTanggalPanjang(h.tanggal)}</span><span className="mt-1 block text-xs text-slate-500">{h.hari} · {h.totalMotor + h.totalMobil} kendaraan</span></span>
            <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-slate-900">{formatRupiah(h.pendapatanKotor)}<ChevronRight size={16} className="shrink-0" /></span>
          </button>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs"><p className="text-slate-500">Bagian pemilik<strong className="mt-1 block text-sm font-semibold text-slate-800">{formatRupiah(h.pendapatanBersih)}</strong></p><p className="text-slate-500">Bagian karyawan<strong className="mt-1 block text-sm font-semibold text-slate-800">{formatRupiah(h.bagianKaryawan)}</strong></p></div>
          <details className="mt-3 text-sm text-slate-600"><summary className="flex min-h-11 cursor-pointer items-center font-medium">Rincian kendaraan</summary><dl className="grid grid-cols-2 gap-2 text-xs">{[['Motor kecil',h.motorKecil],['Motor besar',h.motorBesar],['Mobil kecil',h.mobilKecil],['Mobil sedang',h.mobilSedang],['Mobil besar',h.mobilBesar]].map(([label,value])=><div key={label}><dt>{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl></details>
        </article>)}</div>
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block"><table className="w-full whitespace-nowrap text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Tanggal','Mtr kecil','Mtr besar','Mbl kecil','Mbl sedang','Mbl besar','Motor','Mobil','Kotor','Karyawan','Pemilik'].map(label=><th key={label} className="px-3 py-3 text-left font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{pageDays.map(h=><tr key={h.tanggal}><td className="px-3 py-2"><button type="button" onClick={()=>openDay(h.tanggal)} className="min-h-11 font-semibold text-yellow-700 underline underline-offset-4">{formatTanggalPanjang(h.tanggal)}</button></td>{[h.motorKecil,h.motorBesar,h.mobilKecil,h.mobilSedang,h.mobilBesar,h.totalMotor,h.totalMobil,formatRupiah(h.pendapatanKotor),formatRupiah(h.bagianKaryawan),formatRupiah(h.pendapatanBersih)].map((value,i)=><td key={i} className="px-3 py-3 tabular-nums">{value}</td>)}</tr>)}</tbody></table></div>
        <PaginationControls page={page} totalItems={days.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </>}
    </>}

    {view === "detail" && <>
      <p className="text-xs text-slate-500">Pilih tanggal untuk melihat transaksi{searchValue ? ` yang cocok dengan “${searchValue}”` : ''}.</p>
      {groupError ? <ErrorNotice message={groupError} onRetry={refresh} /> : !groupResult ? <LoadingState /> : groupResult.total === 0 ? <EmptyState title="Tidak ada hasil" description="Coba kata kunci atau periode lain." /> : <>
        <PaginationControls page={groupPage} totalItems={groupResult.total} pageSize={groupResult.pageSize} onPageChange={setGroupPage} />
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">{groupResult.data.map(group=><button key={group.tanggalKey} type="button" onClick={()=>openDay(group.tanggalKey)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"><span><span className="block text-sm font-semibold">{formatTanggalPanjang(group.tanggalKey)}</span><span className="mt-1 block text-xs text-slate-500">{group.totalTransaksi} transaksi</span></span><span className="flex items-center gap-2 text-sm font-semibold tabular-nums">{formatRupiah(group.pendapatanKotor)}<ChevronRight size={18} className="shrink-0" /></span></button>)}</div>
        <PaginationControls page={groupPage} totalItems={groupResult.total} pageSize={groupResult.pageSize} onPageChange={setGroupPage} />
      </>}
    </>}

    {panel === "filter" && <Modal title="Filter rekap" description="Tanggal menggunakan waktu WIB." onClose={()=>setPanel(null)} footer={<Button className="w-full" form="rekap-filter" type="submit">Tampilkan hasil</Button>}>
      <form id="rekap-filter" onSubmit={event=>{event.preventDefault();apply(draft.from,draft.to)}} className="space-y-4"><DateRangeFields from={draft.from} to={draft.to} onFromChange={from=>setDraft(value=>({...value,from}))} onToChange={to=>setDraft(value=>({...value,to}))} />{filterError && <ErrorNotice message={filterError} />}</form>
    </Modal>}
    {panel === "export" && <Modal title="Ekspor laporan" description="Periode ekspor dapat diubah tanpa mengubah rekap." busy={!!exporting} onClose={()=>setPanel(null)} footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={()=>void download('excel')} disabled={!!exporting}>{exporting==='excel'?'Menyiapkan…':'Unduh Excel'}</Button><Button onClick={()=>void download('pdf')} disabled={!!exporting}>{exporting==='pdf'?'Menyiapkan…':'Unduh PDF'}</Button></div>}>
      <div className="space-y-4"><DateRangeFields from={exportPeriod.from} to={exportPeriod.to} onFromChange={from=>setExportPeriod(value=>({...value,from}))} onToChange={to=>setExportPeriod(value=>({...value,to}))} /><p className="text-sm text-slate-500">Laporan mencakup seluruh transaksi dalam periode, termasuk halaman yang belum dibuka.</p>{filterError && <ErrorNotice message={filterError} />}</div>
    </Modal>}
    {day && <DailyTransactionsModal tanggalKey={day} result={dailyResult ?? null} isPending={!dailyResult && !dailyError} error={dailyError} search={view==='detail'?searchValue:''} onRetry={refresh} onPageChange={setDayPage} onClose={()=>setDay(null)} onEdit={target=>{if(!vehicles.length){addToast('Daftar kendaraan belum tersedia. Muat ulang halaman lalu coba lagi.','error');return}setEditTarget(target)}} onDelete={setDeleteTarget} />}
    {editTarget && <EditTransaksiModal transaksi={editTarget} jenisKendaraanList={vehicles} onCancel={()=>setEditTarget(null)} onSaved={()=>{setEditTarget(null);refresh()}} onResult={addToast} />}
    {deleteTarget && <ConfirmDeleteModal transaksi={deleteTarget} isPending={deleting} onCancel={()=>setDeleteTarget(null)} onConfirm={()=>void remove()} />}
  </div>
}
