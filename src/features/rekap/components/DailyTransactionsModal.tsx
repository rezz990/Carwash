import { Pencil, Trash2 } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { EmptyState, ErrorNotice, LoadingState } from "@/components/ui/Feedback"
import { formatRupiah, formatWaktu, formatTanggalPanjang } from "@/lib/formatters"
import type { TransaksiDetail, PaginatedDailyTransactions } from "../actions"
import { PaginationControls } from "./PaginationControls"

export function DailyTransactionsModal({ tanggalKey, result, isPending, error, search, onRetry, onPageChange, onClose, onEdit, onDelete }: {
  tanggalKey: string; result: PaginatedDailyTransactions | null; isPending: boolean; error?: string; search?: string; onRetry: () => void
  onPageChange: (page: number) => void; onClose: () => void; onEdit: (transaksi: TransaksiDetail) => void; onDelete: (transaksi: TransaksiDetail) => void
}) {
  const plate = (t: TransaksiDetail) => !t.plat_nomor || t.plat_nomor === "B0000XX" ? "Tanpa plat" : t.plat_nomor
  const pagination = result && <PaginationControls page={result.page} totalItems={result.total} pageSize={result.pageSize} onPageChange={onPageChange} />
  return <Modal title={`Transaksi ${formatTanggalPanjang(tanggalKey)}`} description={search ? `Hasil pencarian “${search}” pada tanggal ini.` : "Seluruh transaksi pada tanggal ini · WIB"} onClose={onClose} wide fullScreenMobile
    footer={result && <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-slate-500">{result.total} transaksi</span><span>Total <strong className="tabular-nums">{formatRupiah(result.totalPendapatanKotor)}</strong></span></div>}>
    {error ? <ErrorNotice message={error} onRetry={onRetry} /> : isPending ? <LoadingState label="Memuat transaksi harian…" /> : !result?.data.length ? <EmptyState title="Tidak ada transaksi" description="Tidak ada transaksi yang cocok pada halaman ini. Coba halaman sebelumnya atau muat ulang." /> : <>
      {pagination}
      <div className="space-y-3 md:hidden">{result.data.map(t=><article key={t.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">{plate(t)}</p><p className="mt-1 text-sm text-slate-500">{t.kategori} {t.ukuran} · {formatWaktu(t.tanggal_waktu)}</p></div><strong className="text-base tabular-nums">{formatRupiah(t.tarif_total)}</strong></div>
        <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Kasir</dt><dd className="break-words text-right">{t.kasir_nama || '—'}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Bagian karyawan</dt><dd className="tabular-nums">{formatRupiah(t.tarif_jatah_karyawan)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Bagian pemilik</dt><dd className="tabular-nums">{formatRupiah(t.tarif_jatah_pemilik)}</dd></div></dl>
        {t.edited_at && <p className="mt-3 text-xs text-amber-700">Diubah oleh admin</p>}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3"><Button variant="outline" onClick={()=>onEdit(t)} className="gap-2"><Pencil size={15} />Koreksi</Button><Button variant="ghost" onClick={()=>onDelete(t)} className="gap-2 text-red-700 hover:text-red-800"><Trash2 size={15} />Hapus</Button></div>
      </article>)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full whitespace-nowrap text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-500">{['Waktu','Kendaraan','Plat','Kasir','Tarif','Karyawan','Pemilik','Aksi'].map(label=><th key={label} className="px-3 py-3 text-left font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{result.data.map(t=><tr key={t.id}><td className="p-3">{formatWaktu(t.tanggal_waktu)}</td><td className="p-3">{t.kategori} {t.ukuran}{t.edited_at && <span className="ml-2 text-xs text-amber-700">Diubah</span>}</td><td className="p-3 font-medium">{plate(t)}</td><td className="p-3">{t.kasir_nama || '—'}</td><td className="p-3 tabular-nums">{formatRupiah(t.tarif_total)}</td><td className="p-3 tabular-nums">{formatRupiah(t.tarif_jatah_karyawan)}</td><td className="p-3 tabular-nums">{formatRupiah(t.tarif_jatah_pemilik)}</td><td><div className="flex"><button type="button" className="icon-button" aria-label={`Koreksi ${plate(t)}`} onClick={()=>onEdit(t)}><Pencil size={17} /></button><button type="button" className="icon-button text-red-700" aria-label={`Hapus ${plate(t)}`} onClick={()=>onDelete(t)}><Trash2 size={17} /></button></div></td></tr>)}</tbody></table></div>
      {pagination}
    </>}
  </Modal>
}
