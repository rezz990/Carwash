import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { ErrorNotice } from "@/components/ui/Feedback"
import { updateTransaksi, type TransaksiDetail } from "../actions"

export function EditTransaksiModal({ transaksi, jenisKendaraanList, onCancel, onSaved, onResult }: {
  transaksi: TransaksiDetail; jenisKendaraanList: {id:string;kategori:string;ukuran:string}[]; onCancel:()=>void; onSaved:()=>void; onResult:(message:string,type:"success"|"error")=>void
}) {
  const [jenisId,setJenisId]=useState(transaksi.jenis_kendaraan_id)
  const [plate,setPlate]=useState(transaksi.plat_nomor || '')
  const [confirm,setConfirm]=useState(false)
  const [pending,setPending]=useState(false)
  const [error,setError]=useState('')
  const vehicleChanged=jenisId!==transaksi.jenis_kendaraan_id
  async function save(){
    if(pending)return
    setPending(true);setError('')
    try{
      const result=await updateTransaksi({id:transaksi.id,jenisKendaraanId:jenisId,platNomor:plate.trim()||null,expectedEditedAt:transaksi.edited_at})
      if(result.error){setError(result.error);setConfirm(false)}
      else{onResult('Transaksi berhasil diperbarui','success');onSaved()}
    }catch{setError('Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.');setConfirm(false)}
    finally{setPending(false)}
  }
  return <Modal title={confirm?'Simpan koreksi transaksi?':'Koreksi transaksi'} onClose={onCancel} busy={pending}
    footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" disabled={pending} onClick={()=>confirm?setConfirm(false):onCancel()}>{confirm?'Kembali':'Batal'}</Button><Button disabled={pending||!jenisId} onClick={()=>confirm?void save():setConfirm(true)}>{pending?'Menyimpan…':confirm?'Ya, simpan':'Tinjau perubahan'}</Button></div>}>
    {confirm?<div className="space-y-3 text-sm"><p>Plat: <strong>{plate.trim() || 'Tanpa plat'}</strong></p><p className="text-slate-600">{vehicleChanged?'Jenis kendaraan berubah. Tarif dan pembagiannya akan mengikuti tarif kendaraan yang baru dipilih.':'Koreksi plat mempertahankan tarif dan pembagian pendapatan transaksi ini.'}</p></div>:<div className="space-y-4">
      {error&&<ErrorNotice message={error}/>}
      <div><label htmlFor="edit-transaction-vehicle" className="field-label">Jenis kendaraan</label><select id="edit-transaction-vehicle" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base" value={jenisId} onChange={e=>setJenisId(e.target.value)}>{!jenisKendaraanList.some(v=>v.id===transaksi.jenis_kendaraan_id)&&<option value={transaksi.jenis_kendaraan_id}>{transaksi.kategori} {transaksi.ukuran} (nonaktif)</option>}{jenisKendaraanList.map(v=><option key={v.id} value={v.id}>{v.kategori} {v.ukuran}</option>)}</select></div>
      <div><label htmlFor="edit-transaction-plate" className="field-label">Plat nomor</label><Input id="edit-transaction-plate" value={plate} maxLength={50} autoCapitalize="characters" onChange={e=>setPlate(e.target.value.toUpperCase())}/></div>
      <p className="text-sm text-slate-500">Perubahan dicatat di Log Aktivitas.</p>
    </div>}
  </Modal>
}
