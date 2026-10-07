import { formatTanggalPanjang, formatTanggalSingkat, formatRupiah, formatRupiahSingkat } from "@/lib/formatters"
import { BUSINESS_TIMEZONE } from "@/lib/datetime"
import { type ExportTransaksiRow, type RekapHarian } from "./actions"

function wibDateTimeParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso))
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") }
}

// Komponen UTC disamakan dengan jam dinding WIB supaya Excel menampilkan jam WIB apa adanya.
function wibWallClockDate(iso: string): Date {
  const p = wibDateTimeParts(iso)
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second))
}

function formatWibDateTime(iso: string): string {
  const p = wibDateTimeParts(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(p.day)}/${pad(p.month)}/${p.year} ${pad(p.hour)}:${pad(p.minute)}`
}

function labelJenisKendaraan(row: ExportTransaksiRow): string {
  if (row.kategori === "-" && row.ukuran === "-") return "-"
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return `${cap(row.kategori)} ${cap(row.ukuran)}`
}

export async function exportExcel({
  harian,
  dateFrom,
  dateTo,
}: {
  harian: RekapHarian[]
  dateFrom: string
  dateTo: string
}) {
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
  sheet.views = [{ state: "frozen", ySplit: 1 }]

  const currencyCols = ["pendapatanKotor", "bagianKaryawan", "pendapatanBersih"]
  const numberCols = ["motorKecil", "motorBesar", "mobilKecil", "mobilSedang", "mobilBesar", "totalMotor", "totalMobil"]

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

  const exportTotalKolom = {
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
  }
  const exportRataRata = {
    motorKecil: exportTotalKolom.motorKecil / harian.length,
    motorBesar: exportTotalKolom.motorBesar / harian.length,
    mobilKecil: exportTotalKolom.mobilKecil / harian.length,
    mobilSedang: exportTotalKolom.mobilSedang / harian.length,
    mobilBesar: exportTotalKolom.mobilBesar / harian.length,
    totalMotor: exportTotalKolom.totalMotor / harian.length,
    totalMobil: exportTotalKolom.totalMobil / harian.length,
    pendapatanKotor: exportTotalKolom.pendapatanKotor / harian.length,
    bagianKaryawan: exportTotalKolom.bagianKaryawan / harian.length,
    pendapatanBersih: exportTotalKolom.pendapatanBersih / harian.length,
  }

  const totalRow = sheet.addRow({
    tanggal: "TOTAL", hari: "",
    ...exportTotalKolom,
  })
  totalRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EAED" } }
    cell.border = { top: { style: "double" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
  })
  currencyCols.forEach((key) => {
    sheet.getRow(totalRow.number).getCell(columns.findIndex((c) => c.key === key) + 1).numFmt = '"Rp"#,##0'
  })

  const rataRow = sheet.addRow({
    tanggal: "RATA-RATA", hari: "",
    motorKecil: Math.round(exportRataRata.motorKecil * 10) / 10,
    motorBesar: Math.round(exportRataRata.motorBesar * 10) / 10,
    mobilKecil: Math.round(exportRataRata.mobilKecil * 10) / 10,
    mobilSedang: Math.round(exportRataRata.mobilSedang * 10) / 10,
    mobilBesar: Math.round(exportRataRata.mobilBesar * 10) / 10,
    totalMotor: Math.round(exportRataRata.totalMotor * 10) / 10,
    totalMobil: Math.round(exportRataRata.totalMobil * 10) / 10,
    pendapatanKotor: Math.round(exportRataRata.pendapatanKotor),
    bagianKaryawan: Math.round(exportRataRata.bagianKaryawan),
    pendapatanBersih: Math.round(exportRataRata.pendapatanBersih),
  })
  rataRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: "FF6B7280" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE7F6" } }
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
  })
  currencyCols.forEach((key) => {
    sheet.getRow(rataRow.number).getCell(columns.findIndex((c) => c.key === key) + 1).numFmt = '"Rp"#,##0'
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `rekap-${dateFrom}_${dateTo}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportPdf({
  harian,
  dateFrom,
  dateTo,
  totalPendapatanKotor,
  totalTransaksi,
  totalBagianKaryawan,
  totalPendapatanBersih,
}: {
  harian: RekapHarian[]
  dateFrom: string
  dateTo: string
  totalPendapatanKotor: number
  totalTransaksi: number
  totalBagianKaryawan: number
  totalPendapatanBersih: number
}) {
  const { default: jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const doc = new jsPDF({ orientation: "landscape" })

  doc.setFontSize(14)
  doc.text("Rekap Laporan POS Carwash", 14, 15)
  doc.setFontSize(10)
  doc.text(`Periode: ${formatTanggalPanjang(dateFrom)} - ${formatTanggalPanjang(dateTo)}`, 14, 21)
  doc.text(
    `Total Pendapatan Kotor: ${formatRupiah(totalPendapatanKotor)}  |  Total Transaksi: ${totalTransaksi}`,
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

  const exportTotal = {
    motorKecil: harian.reduce((a, h) => a + h.motorKecil, 0),
    motorBesar: harian.reduce((a, h) => a + h.motorBesar, 0),
    mobilKecil: harian.reduce((a, h) => a + h.mobilKecil, 0),
    mobilSedang: harian.reduce((a, h) => a + h.mobilSedang, 0),
    mobilBesar: harian.reduce((a, h) => a + h.mobilBesar, 0),
    totalMotor: harian.reduce((a, h) => a + h.totalMotor, 0),
    totalMobil: harian.reduce((a, h) => a + h.totalMobil, 0),
  }
  body.push([
    "TOTAL", "",
    exportTotal.motorKecil, exportTotal.motorBesar, exportTotal.mobilKecil, exportTotal.mobilSedang, exportTotal.mobilBesar,
    exportTotal.totalMotor, exportTotal.totalMobil,
    formatRupiahSingkat(totalPendapatanKotor),
    formatRupiahSingkat(totalBagianKaryawan),
    formatRupiahSingkat(totalPendapatanBersih),
  ])

  autoTable(doc, {
    head,
    body,
    startY: 32,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [250, 204, 21] }, // yellow-400
  })

  doc.save(`rekap-${dateFrom}_${dateTo}.pdf`)
}

export async function exportDetailExcel({
  rows,
  dateFrom,
  dateTo,
}: {
  rows: ExportTransaksiRow[]
  dateFrom: string
  dateTo: string
}) {
  const ExcelJS = (await import("exceljs")).default
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Detail")

  const columns = [
    { header: "No", key: "no", width: 6 },
    { header: "Tanggal", key: "tanggal", width: 12 },
    { header: "Jam (WIB)", key: "jam", width: 11 },
    { header: "Jenis Kendaraan", key: "jenisKendaraan", width: 17 },
    { header: "Plat Nomor", key: "platNomor", width: 14 },
    { header: "Kasir", key: "kasir", width: 18 },
    { header: "Petugas Cuci", key: "petugasCuci", width: 18 },
    { header: "Tarif Total", key: "tarifTotal", width: 14 },
    { header: "Bagian Karyawan", key: "bagianKaryawan", width: 16 },
    { header: "Bagian Pemilik", key: "bagianPemilik", width: 16 },
  ]
  sheet.columns = columns
  sheet.autoFilter = "A1:J1"

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
  sheet.views = [{ state: "frozen", ySplit: 1 }]

  const currencyCols = ["tarifTotal", "bagianKaryawan", "bagianPemilik"]

  rows.forEach((row, index) => {
    const tanggal = wibWallClockDate(row.tanggal_waktu)
    const added = sheet.addRow({
      no: index + 1,
      tanggal,
      jam: tanggal,
      jenisKendaraan: labelJenisKendaraan(row),
      platNomor: row.plat_nomor ?? "-",
      kasir: row.kasir_nama ?? "-",
      petugasCuci: row.petugas_nama ?? "-",
      tarifTotal: row.tarif_total,
      bagianKaryawan: row.tarif_jatah_karyawan,
      bagianPemilik: row.tarif_jatah_pemilik,
    })
    added.eachCell((cell) => {
      cell.border = {
        top: { style: "hair" }, bottom: { style: "hair" },
        left: { style: "hair" }, right: { style: "hair" },
      }
    })
  })

  const lastDataRow = sheet.rowCount
  for (let r = 2; r <= lastDataRow; r++) {
    sheet.getRow(r).getCell(2).numFmt = "dd/mm/yyyy"
    sheet.getRow(r).getCell(3).numFmt = "hh:mm"
    ;[1, 2, 3].forEach((col) => {
      sheet.getRow(r).getCell(col).alignment = { horizontal: "center" }
    })
    currencyCols.forEach((key) => {
      const cell = sheet.getRow(r).getCell(columns.findIndex((c) => c.key === key) + 1)
      cell.numFmt = '"Rp"#,##0'
    })
  }

  const totalRow = sheet.addRow({
    no: `TOTAL (${rows.length} transaksi)`,
    tarifTotal: rows.reduce((a, r) => a + r.tarif_total, 0),
    bagianKaryawan: rows.reduce((a, r) => a + r.tarif_jatah_karyawan, 0),
    bagianPemilik: rows.reduce((a, r) => a + r.tarif_jatah_pemilik, 0),
  })
  totalRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EAED" } }
    cell.border = { top: { style: "double" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
  })
  currencyCols.forEach((key) => {
    sheet.getRow(totalRow.number).getCell(columns.findIndex((c) => c.key === key) + 1).numFmt = '"Rp"#,##0'
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `detail-${dateFrom}_${dateTo}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportDetailPdf({
  rows,
  dateFrom,
  dateTo,
}: {
  rows: ExportTransaksiRow[]
  dateFrom: string
  dateTo: string
}) {
  const { default: jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const doc = new jsPDF({ orientation: "landscape" })

  const totalTarif = rows.reduce((a, r) => a + r.tarif_total, 0)
  const totalKaryawan = rows.reduce((a, r) => a + r.tarif_jatah_karyawan, 0)
  const totalPemilik = rows.reduce((a, r) => a + r.tarif_jatah_pemilik, 0)

  doc.setFontSize(14)
  doc.text("Detail Transaksi POS Carwash", 14, 15)
  doc.setFontSize(10)
  doc.text(`Periode: ${formatTanggalPanjang(dateFrom)} - ${formatTanggalPanjang(dateTo)}`, 14, 21)
  doc.text(`Total Transaksi: ${rows.length}  |  Total Pendapatan: ${formatRupiah(totalTarif)}`, 14, 26)

  const head = [[
    "No", "Waktu", "Jenis Kendaraan", "Plat Nomor", "Kasir", "Petugas Cuci",
    "Tarif Total", "Bagian Karyawan", "Bagian Pemilik",
  ]]

  const body = rows.map((row, index) => [
    index + 1,
    formatWibDateTime(row.tanggal_waktu),
    labelJenisKendaraan(row),
    row.plat_nomor ?? "-",
    row.kasir_nama ?? "-",
    row.petugas_nama ?? "-",
    formatRupiahSingkat(row.tarif_total),
    formatRupiahSingkat(row.tarif_jatah_karyawan),
    formatRupiahSingkat(row.tarif_jatah_pemilik),
  ])
  body.push([
    "", "", "", "", "", "TOTAL",
    formatRupiahSingkat(totalTarif),
    formatRupiahSingkat(totalKaryawan),
    formatRupiahSingkat(totalPemilik),
  ])

  autoTable(doc, {
    head,
    body,
    startY: 32,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [250, 204, 21] }, // yellow-400
    columnStyles: {
      0: { halign: "center" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
    },
    didDrawPage: () => {
      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(
        `Halaman ${doc.getNumberOfPages()}`,
        doc.internal.pageSize.getWidth() - 14,
        doc.internal.pageSize.getHeight() - 6,
        { align: "right" },
      )
      doc.setTextColor(0)
    },
  })

  doc.save(`detail-${dateFrom}_${dateTo}.pdf`)
}
