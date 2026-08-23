import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/Button"
import { formatRupiah } from "@/lib/formatters"
import { type TransaksiDetail } from "../actions"

export function ConfirmDeleteModal({
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
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 animate-in zoom-in-95 duration-300">
        <div className="px-6 py-5 text-center">
          <div className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-4 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
          </div>
          <h2
            ref={titleRef}
            tabIndex={-1}
            className="text-lg font-bold text-slate-900 outline-none"
          >
            Hapus transaksi ini?
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Transaksi <span className="font-semibold text-slate-700">{transaksi.kategori} {transaksi.ukuran}</span>
            {transaksi.plat_nomor && <> plat <span className="font-mono font-semibold">{transaksi.plat_nomor}</span></>} senilai{" "}
            <span className="font-semibold text-slate-700">{formatRupiah(transaksi.tarif_total)}</span> akan dihapus permanen.
            Tindakan ini <span className="font-semibold text-red-600">tidak bisa dibatalkan</span>.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-center">
          <Button type="button" variant="outline" className="w-28" onClick={onCancel} disabled={isPending}>
            Batal
          </Button>
          <Button
            type="button"
            className="w-28 bg-red-600 hover:bg-red-700 text-white"
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
