"use client"

import { useState, useEffect, useTransition, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { fetchRekap, type RekapHarian, type TransaksiDetail } from "./actions"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
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

  // Data untuk chart perbandingan kategori kendaraan (dijumlah sepanjang periode)
  const kategoriChartData = useMemo(() => {
    const totals = harian.reduce(
      (acc, h) => {
        acc.motorKecil += h.motorKecil
        acc.motorBesar += h.motorBesar
        acc.mobilKecil += h.mobilKecil
        acc.mobilSedang += h.mobilSedang
        acc.mobilBesar += h.mobilBesar
        return acc
      },
      { motorKecil: 0, motorBesar: 0, mobilKecil: 0, mobilSedang: 0, mobilBesar: 0 }
    )
    return [
      { kategori: "Motor Kecil", jumlah: totals.motorKecil },
      { kategori: "Motor Besar", jumlah: totals.motorBesar },
      { kategori: "Mobil Kecil", jumlah: totals.mobilKecil },
      { kategori: "Mobil Sedang", jumlah: totals.mobilSedang },
      { kategori: "Mobil Besar", jumlah: totals.mobilBesar },
    ]
  }, [harian])

  const trenChartData = useMemo(
    () =>
      harian.map((h) => ({
        tanggal: formatTanggalSingkat(h.tanggal),
        "Pendapatan Kotor": h.pendapatanKotor,
        "Pendapatan Bersih": h.pendapatanBersih,
      })),
    [harian]
  )

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
        { header: "Catatan", key: "catatan", width: 20 },
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
          catatan: "",
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
        "Tanggal", "Hari", "Motor Kecil", "Motor Besar", "Mobil Kecil", "Mobil Sedang", "Mobil Besar",
        "Total Motor", "Total Mobil", "Kotor", "Karyawan", "Bersih",
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Tren Pendapatan</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trenChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatRupiahSingkat} />
              <Tooltip formatter={(value) => formatRupiah(Number(value ?? 0))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Pendapatan Kotor" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Pendapatan Bersih" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Jumlah Unit per Kategori</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={kategoriChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="kategori" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="jumlah" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Toggle view */}
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
              {harian.map((h) => (
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-900">{formatTanggalSingkat(t.tanggal_waktu)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{formatWaktu(t.tanggal_waktu)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{t.kategori} {t.ukuran}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs">{t.plat_nomor || "-"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{t.kasir_username || "-"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatRupiah(t.tarif_total)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-600">{formatRupiah(t.tarif_jatah_karyawan)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{formatRupiah(t.tarif_jatah_pemilik)}</td>
                </tr>
              ))}
              {detail.length === 0 && !isPending && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">Tidak ada transaksi untuk periode ini</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}