"use client"

import { useState, useEffect, useTransition, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  fetchRekap,
  updateTransaksi,
  deleteTransaksi,
  fetchJenisKendaraanAktif,
  type RekapHarian,
  type TransaksiDetail,
} from "./actions"

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

// PENTING: selalu pakai timeZone: "Asia/Jakarta" eksplisit, jangan andalkan
// timezone bawaan device/browser user (bisa salah setting) atau default
// server. Ini juga menjaga hasil tampilan konsisten dengan pengelompokan
// tanggal yang sudah dihitung di server (lihat actions.ts).
function formatTanggalSingkat(tanggal: string) {
  const d = new Date(tanggal)
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", timeZone: "Asia/Jakarta" })
}

function formatWaktu(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })
}

function formatTanggalPanjang(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: "indigo" | "emerald" | "slate" }) {
  const colorMap = {
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    slate: "text-slate-900",
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1.5 tabular-nums ${colorMap[accent || "slate"]}`}>{value}</p>
    </div>
  )
}

function PaginationControls({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  if (totalItems === 0) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
      <p className="text-xs text-slate-500">
        Menampilkan <span className="font-medium text-slate-700">{startItem}-{endItem}</span> dari{" "}
        <span className="font-medium text-slate-700">{totalItems}</span> data
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Sebelumnya
        </Button>
        <span className="text-xs text-slate-500 px-2">
          Halaman {page} dari {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  )
}

// Modal konfirmasi hapus - selalu tampil sebelum aksi hapus dieksekusi
function ConfirmDeleteModal({
  transaksi,
  onCancel,
  onConfirm,
  isPending,
}: {
  transaksi: TransaksiDetail
  onCancel: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="px-6 py-5">
          <div className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Hapus transaksi ini?</h2>
          <p className="text-sm text-slate-500 mt-2">
            Transaksi <span className="font-semibold text-slate-700">{transaksi.kategori} {transaksi.ukuran}</span>
            {transaksi.plat_nomor && <> plat <span className="font-mono font-semibold">{transaksi.plat_nomor}</span></>} senilai{" "}
            <span className="font-semibold text-slate-700">{formatRupiah(transaksi.tarif_total)}</span> akan dihapus permanen.
            Tindakan ini <span className="font-semibold text-red-600">tidak bisa dibatalkan</span>.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isPending}>
            Batal
          </Button>
          <Button
            type="button"
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Menghapus..." : "Ya, Hapus"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Modal edit transaksi - ubah jenis kendaraan & plat nomor, dengan
// konfirmasi terpisah sebelum submit
function EditTransaksiModal({
  transaksi,
  jenisKendaraanList,
  onCancel,
  onSaved,
  onResult,
}: {
  transaksi: TransaksiDetail
  jenisKendaraanList: { id: string; kategori: string; ukuran: string }[]
  onCancel: () => void
  onSaved: () => void
  onResult: (msg: string, type: "success" | "error") => void
}) {
  const initialJenisId = jenisKendaraanList.find(
    (jk) => jk.kategori === transaksi.kategori && jk.ukuran === transaksi.ukuran
  )?.id || ""

  const [jenisId, setJenisId] = useState(initialJenisId)
  const [platNomor, setPlatNomor] = useState(transaksi.plat_nomor || "")
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await updateTransaksi({
        id: transaksi.id,
        jenisKendaraanId: jenisId,
        platNomor: platNomor.trim() || null,
      })
      if (result.error) {
        setError(result.error)
        setShowConfirm(false)
      } else {
        onResult("Transaksi berhasil diperbarui", "success")
        onSaved()
      }
    })
  }

  if (showConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          <div className="px-6 py-5">
            <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Simpan perubahan?</h2>
            <p className="text-sm text-slate-500 mt-2">
              Tarif dan pembagian jatah karyawan/pemilik akan dihitung ulang otomatis sesuai jenis kendaraan yang dipilih.
            </p>
          </div>
          {error && (
            <div className="mx-6 mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">{error}</div>
          )}
          <div className="px-6 pb-6 flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowConfirm(false)} disabled={isPending}>
              Kembali
            </Button>
            <Button type="button" className="flex-1" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Menyimpan..." : "Ya, Simpan"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Edit Transaksi</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Jenis Kendaraan</label>
            <select
              value={jenisId}
              onChange={(e) => setJenisId(e.target.value)}
              className="w-full h-11 px-3 text-sm rounded-lg border border-slate-200 bg-white"
            >
              {jenisKendaraanList.map((jk) => (
                <option key={jk.id} value={jk.id}>{jk.kategori} {jk.ukuran}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Plat Nomor</label>
            <Input
              value={platNomor}
              onChange={(e) => setPlatNomor(e.target.value.toUpperCase())}
              placeholder="Opsional"
              className="uppercase"
            />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Batal
          </Button>
          <Button type="button" className="flex-1" onClick={() => setShowConfirm(true)} disabled={!jenisId}>
            Lanjutkan
          </Button>
        </div>
      </div>
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
  const [dateFrom, setDateFrom] = useState(defaultDateFrom)
  const [dateTo, setDateTo] = useState(defaultDateTo)
  const [harian, setHarian] = useState<RekapHarian[]>([])
  const [detail, setDetail] = useState<TransaksiDetail[]>([])
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

  const loadData = useCallback(() => {
    setError(null)
    startTransition(async () => {
      const result = await fetchRekap({ dateFrom, dateTo })
      if (result.error) {
        setError(result.error)
        return
      }
      setHarian(result.harian)
      setDetail(result.detail)
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
  }, [dateFrom, dateTo])

  useEffect(() => {
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

  // Search cuma berlaku di tabel Detail Transaksi - cari berdasarkan plat
  // nomor atau nama kasir (case-insensitive, contains)
  const detailFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return detail
    return detail.filter(
      (t) =>
        (t.plat_nomor || "").toLowerCase().includes(q) ||
        (t.kasir_nama || "").toLowerCase().includes(q) ||
        `${t.kategori} ${t.ukuran}`.toLowerCase().includes(q)
    )
  }, [detail, searchQuery])

  // Reset ke halaman 1 tiap kali search query berubah, biar ga nyangkut
  // di halaman yang jadi kosong setelah difilter
  useEffect(() => {
    setPageDetail(1)
  }, [searchQuery])

  // Data yang ditampilkan di tabel = 1 halaman saja (50 baris).
  // PENTING: totalKolom & rataRata di atas tetap dihitung dari SEMUA data
  // (bukan cuma yang lagi ditampilkan), jadi baris TOTAL/RATA-RATA di
  // footer tabel tetap akurat walau tabelnya dipaginate.
  const harianPaged = useMemo(
    () => harian.slice((pageHarian - 1) * PAGE_SIZE, pageHarian * PAGE_SIZE),
    [harian, pageHarian]
  )
  const detailPaged = useMemo(
    () => detailFiltered.slice((pageDetail - 1) * PAGE_SIZE, pageDetail * PAGE_SIZE),
    [detailFiltered, pageDetail]
  )

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    startDeleteTransition(async () => {
      const result = await deleteTransaksi(deleteTarget.id)
      if (result.error) {
        showToast(result.error, "error")
      } else {
        showToast("Transaksi berhasil dihapus", "success")
        setDetail((prev) => prev.filter((t) => t.id !== deleteTarget.id))
        loadData() // refresh juga ringkasan harian & totals biar konsisten
      }
      setDeleteTarget(null)
    })
  }

  async function handleExportExcel() {
    setExportingExcel(true)
    try {
      const ExcelJS = (await import("exceljs")).default

      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet("Rekap")

      const columns = [
        { header: "Tanggal", key: "tanggal", width: 14 },
        { header: "Hari", key: "hari", width: 10 },
        { header: "Motor Kecil", key: "motorKecil", width: 12 },
        { header: "Motor Besar", key: "motorBesar", width: 12 },
        { header: "Mobil Kecil", key: "mobilKecil", width: 12 },
        { header: "Mobil Sedang", key: "mobilSedang", width: 13 },
        { header: "Mobil Besar", key: "mobilBesar", width: 12 },
        { header: "Total Motor", key: "totalMotor", width: 12 },
        { header: "Total Mobil", key: "totalMobil", width: 12 },
        { header: "Pendapatan Kotor", key: "pendapatanKotor", width: 18 },
        { header: "Bagian Karyawan", key: "bagianKaryawan", width: 16 },
        { header: "Pendapatan Bersih", key: "pendapatanBersih", width: 18 },
      ]
      sheet.columns = columns

      // Styling header: biru, teks putih bold, rata tengah
      const headerRow = sheet.getRow(1)
      headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A86E8" } }
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.alignment = { horizontal: "center", vertical: "middle" }
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" },
        }
      })
      headerRow.height = 22
      sheet.views = [{ state: "frozen", ySplit: 1 }] // freeze header row

      const currencyCols = ["pendapatanKotor", "bagianKaryawan", "pendapatanBersih"]
      const numberCols = ["motorKecil", "motorBesar", "mobilKecil", "mobilSedang", "mobilBesar", "totalMotor", "totalMobil"]

      // Isi baris data harian
      harian.forEach((h) => {
        const row = sheet.addRow({
          tanggal: formatTanggalPanjang(h.tanggal),
          hari: h.hari,
          motorKecil: h.motorKecil,
          motorBesar: h.motorBesar,
          mobilKecil: h.mobilKecil,
          mobilSedang: h.mobilSedang,
          mobilBesar: h.mobilBesar,
          totalMotor: h.totalMotor,
          totalMobil: h.totalMobil,
          pendapatanKotor: h.pendapatanKotor,
          bagianKaryawan: h.bagianKaryawan,
          pendapatanBersih: h.pendapatanBersih,
        })
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "hair" }, bottom: { style: "hair" },
            left: { style: "hair" }, right: { style: "hair" },
          }
        })
      })

      // Format angka Rupiah untuk kolom uang, rata tengah untuk kolom jumlah unit
      const lastDataRow = sheet.rowCount
      for (let r = 2; r <= lastDataRow; r++) {
        currencyCols.forEach((key) => {
          const cell = sheet.getRow(r).getCell(columns.findIndex((c) => c.key === key) + 1)
          cell.numFmt = '"Rp"#,##0'
        })
        numberCols.forEach((key) => {
          const cell = sheet.getRow(r).getCell(columns.findIndex((c) => c.key === key) + 1)
          cell.alignment = { horizontal: "center" }
        })
      }

      // Baris TOTAL - bold, background abu muda
      const totalRow = sheet.addRow({
        tanggal: "TOTAL", hari: "",
        motorKecil: totalKolom.motorKecil, motorBesar: totalKolom.motorBesar,
        mobilKecil: totalKolom.mobilKecil, mobilSedang: totalKolom.mobilSedang, mobilBesar: totalKolom.mobilBesar,
        totalMotor: totalKolom.totalMotor, totalMobil: totalKolom.totalMobil,
        pendapatanKotor: totalKolom.pendapatanKotor, bagianKaryawan: totalKolom.bagianKaryawan,
        pendapatanBersih: totalKolom.pendapatanBersih, catatan: "",
      })
      totalRow.eachCell((cell) => {
        cell.font = { bold: true }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EAED" } }
        cell.border = { top: { style: "double" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
      })
      currencyCols.forEach((key) => {
        sheet.getRow(totalRow.number).getCell(columns.findIndex((c) => c.key === key) + 1).numFmt = '"Rp"#,##0'
      })

      // Baris RATA-RATA - italic, background ungu muda (mirip referensi asli)
      const rataRow = sheet.addRow({
        tanggal: "RATA-RATA", hari: "",
        motorKecil: Math.round(rataRata.motorKecil * 10) / 10,
        motorBesar: Math.round(rataRata.motorBesar * 10) / 10,
        mobilKecil: Math.round(rataRata.mobilKecil * 10) / 10,
        mobilSedang: Math.round(rataRata.mobilSedang * 10) / 10,
        mobilBesar: Math.round(rataRata.mobilBesar * 10) / 10,
        totalMotor: Math.round(rataRata.totalMotor * 10) / 10,
        totalMobil: Math.round(rataRata.totalMobil * 10) / 10,
        pendapatanKotor: Math.round(rataRata.pendapatanKotor),
        bagianKaryawan: Math.round(rataRata.bagianKaryawan),
        pendapatanBersih: Math.round(rataRata.pendapatanBersih),
        catatan: "",
      })
      rataRow.eachCell((cell) => {
        cell.font = { italic: true, color: { argb: "FF6B7280" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE7F6" } }
        cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
      })
      currencyCols.forEach((key) => {
        sheet.getRow(rataRow.number).getCell(columns.findIndex((c) => c.key === key) + 1).numFmt = '"Rp"#,##0'
      })

      // Trigger download di browser
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `rekap-${dateFrom}_${dateTo}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingExcel(false)
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      const { default: jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF({ orientation: "landscape" })

      doc.setFontSize(14)
      doc.text("Rekap Laporan POS Carwash", 14, 15)
      doc.setFontSize(10)
      doc.text(`Periode: ${formatTanggalPanjang(dateFrom)} - ${formatTanggalPanjang(dateTo)}`, 14, 21)
      doc.text(
        `Total Pendapatan Kotor: ${formatRupiah(totals.totalPendapatanKotor)}  |  Total Transaksi: ${totals.totalTransaksi}`,
        14,
        26
      )

      const head = [[
        "Tanggal", "Hari", "Mtr Kcl", "Mtr Bsr", "Mbl Kcl", "Mbl Sdg", "Mbl Bsr",
        "Tot Mtr", "Tot Mbl", "Kotor", "Karyawan", "Bersih",
      ]]

      const body = harian.map((h) => [
        formatTanggalSingkat(h.tanggal),
        h.hari,
        h.motorKecil, h.motorBesar, h.mobilKecil, h.mobilSedang, h.mobilBesar,
        h.totalMotor, h.totalMobil,
        formatRupiahSingkat(h.pendapatanKotor),
        formatRupiahSingkat(h.bagianKaryawan),
        formatRupiahSingkat(h.pendapatanBersih),
      ])

      body.push([
        "TOTAL", "",
        totalKolom.motorKecil, totalKolom.motorBesar, totalKolom.mobilKecil, totalKolom.mobilSedang, totalKolom.mobilBesar,
        totalKolom.totalMotor, totalKolom.totalMobil,
        formatRupiahSingkat(totalKolom.pendapatanKotor),
        formatRupiahSingkat(totalKolom.bagianKaryawan),
        formatRupiahSingkat(totalKolom.pendapatanBersih),
      ])

      autoTable(doc, {
        head,
        body,
        startY: 32,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
      })

      doc.save(`rekap-${dateFrom}_${dateTo}.pdf`)
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Dari Tanggal</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Sampai Tanggal</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10" />
        </div>
        <Button onClick={loadData} disabled={isPending} className="h-10">
          {isPending ? "Memuat..." : "Terapkan Filter"}
        </Button>
        <div className="flex-1" />
        <Button variant="outline" onClick={handleExportExcel} disabled={exportingExcel || harian.length === 0} className="h-10">
          {exportingExcel ? "Menyiapkan..." : "Export Excel"}
        </Button>
        <Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf || harian.length === 0} className="h-10">
          {exportingPdf ? "Menyiapkan..." : "Export PDF"}
        </Button>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Pendapatan Kotor" value={formatRupiah(totals.totalPendapatanKotor)} accent="slate" />
        <SummaryCard label="Pendapatan Bersih" value={formatRupiah(totals.totalPendapatanBersih)} accent="indigo" />
        <SummaryCard label="Total Transaksi" value={totals.totalTransaksi.toString()} accent="emerald" />
        <SummaryCard label="Rata-rata / Hari" value={formatRupiah(Math.round(totals.rataRataPerHari))} accent="slate" />
      </div>

      {/* Toggle view + Search (search cuma relevan buat Detail Transaksi) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setView("harian")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              view === "harian" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            Ringkasan Harian
          </button>
          <button
            onClick={() => setView("detail")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              view === "detail" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            Detail Transaksi
          </button>
        </div>

        {view === "detail" && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari plat nomor, kasir, jenis..."
              className="pl-9 h-10"
            />
          </div>
        )}
      </div>

      {/* Tabel Ringkasan Harian */}
      {view === "harian" && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-x-auto">
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
      )}

      {/* Tabel Detail Transaksi */}
      {view === "detail" && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Tanggal</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Waktu</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Jenis</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Plat</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Kasir</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Tarif</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Karyawan</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Bersih</th>
                <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailPaged.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-900">{formatTanggalSingkat(t.tanggal_waktu)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{formatWaktu(t.tanggal_waktu)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{t.kategori} {t.ukuran}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs">{t.plat_nomor || "-"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{t.kasir_nama || "-"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatRupiah(t.tarif_total)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-600">{formatRupiah(t.tarif_jatah_karyawan)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{formatRupiah(t.tarif_jatah_pemilik)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditTarget(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit transaksi"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus transaksi"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {detailFiltered.length === 0 && !isPending && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    {searchQuery ? "Tidak ada hasil yang cocok" : "Tidak ada transaksi untuk periode ini"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <PaginationControls
            page={pageDetail}
            totalItems={detailFiltered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPageDetail}
          />
        </div>
      )}

      {editTarget && (
        <EditTransaksiModal
          transaksi={editTarget}
          jenisKendaraanList={jenisKendaraanList}
          onCancel={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null)
            loadData()
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