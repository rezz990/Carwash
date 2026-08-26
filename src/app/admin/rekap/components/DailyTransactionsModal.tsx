import { useEffect, useRef } from "react"
import { formatWaktu, formatRupiah, formatTanggalPanjang } from "@/lib/formatters"
import { type TransaksiDetail } from "../actions"
import { type PaginatedDailyTransactions } from "../actions"
import { PaginationControls } from "./PaginationControls"

export function DailyTransactionsModal({
  tanggalKey,
  result,
  isPending,
  onPageChange,
  onClose,
  onEdit,
  onDelete,
}: {
  tanggalKey: string
  result: PaginatedDailyTransactions | null
  isPending: boolean
  onPageChange: (page: number) => void
  onClose: () => void
  onEdit: (transaksi: TransaksiDetail) => void
  onDelete: (transaksi: TransaksiDetail) => void
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    document.addEventListener("keydown", handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    titleRef.current?.focus()

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const transactions = result?.data ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-transactions-title"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2
              id="daily-transactions-title"
              ref={titleRef}
              tabIndex={-1}
              className="text-lg font-bold text-slate-900 outline-none"
            >
              Transaksi {formatTanggalPanjang(`${tanggalKey}T00:00:00+07:00`)}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {result?.total ?? 0} transaksi pada tanggal ini
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Tutup"
            title="Tutup"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-auto min-h-0">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
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
              {isPending && transactions.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Memuat transaksi...</td></tr>
              )}
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{formatWaktu(t.tanggal_waktu)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>
                        {t.kategori} {t.ukuran}
                      </span>

                      {t.edited_at && (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          DIUBAH
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs">
                    {t.plat_nomor === "B0000XX"
                      ? "TANPA PLAT"
                      : t.plat_nomor || "-"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{t.kasir_nama || "-"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{formatRupiah(t.tarif_total)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-amber-600">{formatRupiah(t.tarif_jatah_karyawan)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{formatRupiah(t.tarif_jatah_pemilik)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
                        title="Edit transaksi"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus transaksi"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6" />
                          <path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result && result.total > result.pageSize && (
            <PaginationControls page={result.page} totalItems={result.total} pageSize={result.pageSize} onPageChange={onPageChange} />
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">{result?.total ?? 0}</span> transaksi
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              Karyawan: <strong className="text-amber-600">{formatRupiah(result?.totalBagianKaryawan ?? 0)}</strong>
            </span>
            <span>
              Bersih: <strong className="text-emerald-600">{formatRupiah(result?.totalPendapatanBersih ?? 0)}</strong>
            </span>
            <span>
              Total: <strong className="text-slate-900">{formatRupiah(result?.totalPendapatanKotor ?? 0)}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
