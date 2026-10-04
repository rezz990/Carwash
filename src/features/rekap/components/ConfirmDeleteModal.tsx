import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { formatRupiah } from "@/lib/formatters"
import type { TransaksiDetail } from "../actions"
export function ConfirmDeleteModal({transaksi,onCancel,onConfirm,isPending}:{transaksi:TransaksiDetail;onCancel:()=>void;onConfirm:()=>void;isPending:boolean}){
  return <Modal title="Hapus transaksi ini?" onClose={onCancel} busy={isPending} footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={onCancel} disabled={isPending}>Batal</Button><Button variant="destructive" onClick={onConfirm} disabled={isPending}>{isPending?'Menghapus…':'Hapus transaksi'}</Button></div>}>
    <div className="space-y-3 text-sm"><p><strong>{transaksi.plat_nomor || 'Tanpa plat'}</strong> · {transaksi.kategori} {transaksi.ukuran}</p><p>Nilai transaksi: <strong>{formatRupiah(transaksi.tarif_total)}</strong></p><p className="text-red-700">Transaksi dihapus permanen dan total laporan ikut berubah. Tindakan ini tidak dapat dibatalkan dari halaman ini.</p></div>
  </Modal>
}
