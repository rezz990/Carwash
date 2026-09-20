"use client"

import { useState, useTransition } from "react"
import { CarFront, Pencil, Plus, Power } from "lucide-react"
import { useToast } from "@/components/toast/ToastProvider"
import { Button } from "@/components/ui/Button"
import { ErrorNotice } from "@/components/ui/Feedback"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { createJenisKendaraan, toggleAktifJenisKendaraan, updateTarifDefault } from "./actions"

export type JenisKendaraan = {
  id: string
  kategori: string
  ukuran: string
  tarif_default: number
  jatah_karyawan: number
  jatah_pemilik: number
  aktif: boolean
}

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)
}

function TariffForm({ item, onClose, onSaved }: {
  item?: JenisKendaraan
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [kategori, setKategori] = useState(item?.kategori ?? "")
  const [ukuran, setUkuran] = useState(item?.ukuran ?? "")
  const [tarif, setTarif] = useState(item ? String(item.tarif_default) : "")
  const [employeeShare, setEmployeeShare] = useState(item ? String(item.jatah_karyawan) : "")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const tariffNumber = Number(tarif)
  const employeeNumber = Number(employeeShare)
  const ownerShare = Number.isFinite(tariffNumber) && Number.isFinite(employeeNumber) ? Math.max(0, tariffNumber - employeeNumber) : 0

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (!kategori.trim() || !ukuran.trim()) return setError("Kategori dan ukuran wajib diisi")
    if (!tarif || !Number.isFinite(tariffNumber) || tariffNumber < 0) return setError("Tarif harus berupa angka yang valid")
    if (!employeeShare || !Number.isFinite(employeeNumber) || employeeNumber < 0) return setError("Bagian karyawan harus berupa angka yang valid")
    if (employeeNumber > tariffNumber) return setError("Bagian karyawan tidak boleh melebihi tarif total")

    startTransition(async () => {
      try {
        const result = item
          ? await updateTarifDefault(item.id, tariffNumber, employeeNumber)
          : await createJenisKendaraan({ kategori, ukuran, tarifDefault: tariffNumber, jatahKaryawan: employeeNumber })
        if (result.error) return setError(result.error)
        onSaved(item ? `Tarif ${item.kategori} ${item.ukuran} diperbarui` : `${kategori.trim()} ${ukuran.trim()} ditambahkan`)
      } catch {
        setError("Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.")
      }
    })
  }

  return <Modal title={item ? `Edit ${item.kategori} ${item.ukuran}` : "Tambah jenis kendaraan"} onClose={onClose} busy={pending} footer={<div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" onClick={onClose} disabled={pending}>Batal</Button><Button type="submit" form="tariff-form" isLoading={pending}>Simpan</Button></div>}>
    <form id="tariff-form" onSubmit={submit} className="space-y-4">
      {error && <ErrorNotice message={error} />}
      <div className="grid grid-cols-2 gap-3">
        <div><label className="field-label" htmlFor="tariff-category">Kategori</label><Input id="tariff-category" maxLength={50} value={kategori} onChange={(event) => setKategori(event.target.value)} placeholder="Contoh: Mobil" disabled={Boolean(item)} autoFocus={!item} /></div>
        <div><label className="field-label" htmlFor="tariff-size">Ukuran</label><Input id="tariff-size" maxLength={50} value={ukuran} onChange={(event) => setUkuran(event.target.value)} placeholder="Contoh: Besar" disabled={Boolean(item)} /></div>
      </div>
      {item && <p className="text-xs leading-5 text-slate-500">Nama jenis kendaraan dikunci agar histori transaksi tetap konsisten. Tambahkan jenis baru bila nama berbeda.</p>}
      <div><label className="field-label" htmlFor="tariff-total">Tarif total</label><Input id="tariff-total" type="number" min="0" max="10000000000" step="1000" inputMode="numeric" value={tarif} onChange={(event) => setTarif(event.target.value)} placeholder="0" autoFocus={Boolean(item)} /></div>
      <div><label className="field-label" htmlFor="employee-share">Bagian karyawan</label><Input id="employee-share" type="number" min="0" max="10000000000" step="1000" inputMode="numeric" value={employeeShare} onChange={(event) => setEmployeeShare(event.target.value)} placeholder="0" /></div>
      <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-medium text-emerald-700">Bagian pemilik dihitung otomatis</p><p className="mt-1 text-xl font-bold text-emerald-900 tabular-nums">{rupiah(ownerShare)}</p></div>
    </form>
  </Modal>
}

export function TarifTable({ data, loadError }: { data: JenisKendaraan[]; loadError?: string }) {
  const [editor, setEditor] = useState<JenisKendaraan | "new" | null>(null)
  const [statusTarget, setStatusTarget] = useState<JenisKendaraan | null>(null)
  const [pending, startTransition] = useTransition()
  const { addToast } = useToast()

  function saved(message: string) {
    setEditor(null)
    addToast(message, "success")
  }

  function changeStatus() {
    if (!statusTarget) return
    const target = statusTarget
    startTransition(async () => {
      try {
        const result = await toggleAktifJenisKendaraan(target.id, !target.aktif)
        if (result.error) addToast(result.error, "error")
        else addToast(`${target.kategori} ${target.ukuran} ${target.aktif ? "dinonaktifkan" : "diaktifkan"}`, "success")
      } catch {
        addToast("Status belum berubah. Periksa koneksi lalu coba lagi.", "error")
      } finally {
        setStatusTarget(null)
      }
    })
  }

  return <div className="space-y-4">
    {loadError && <ErrorNotice message={loadError} />}
    <div className="flex justify-stretch sm:justify-end"><Button className="w-full sm:w-auto" onClick={() => setEditor("new")}><Plus size={18} /> Tambah jenis</Button></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.map((item) => <article key={item.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${item.aktif ? "border-slate-200" : "border-slate-200 opacity-70"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3"><span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${item.aktif ? "bg-yellow-50 text-yellow-700" : "bg-slate-100 text-slate-500"}`}><CarFront size={21} /></span><div className="min-w-0"><h2 className="truncate font-bold text-slate-900">{item.kategori} {item.ukuran}</h2><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${item.aktif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.aktif ? "Aktif" : "Nonaktif"}</span></div></div>
          <button type="button" onClick={() => setEditor(item)} className="icon-button shrink-0" aria-label={`Edit tarif ${item.kategori} ${item.ukuran}`}><Pencil size={18} /></button>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-500">Tarif total</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">{rupiah(item.tarif_default)}</p><div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs"><p className="text-slate-500">Karyawan<strong className="mt-1 block text-sm text-slate-800 tabular-nums">{rupiah(item.jatah_karyawan)}</strong></p><p className="text-slate-500">Pemilik<strong className="mt-1 block text-sm text-slate-800 tabular-nums">{rupiah(item.jatah_pemilik)}</strong></p></div></div>
        <Button variant="outline" className={`mt-4 w-full ${item.aktif ? "text-red-700" : "text-emerald-700"}`} onClick={() => setStatusTarget(item)}><Power size={17} /> {item.aktif ? "Nonaktifkan" : "Aktifkan"}</Button>
      </article>)}
    </div>
    {!loadError && data.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">Belum ada jenis kendaraan.</div>}

    {editor && <TariffForm item={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSaved={saved} />}
    {statusTarget && <Modal title={statusTarget.aktif ? "Nonaktifkan jenis kendaraan?" : "Aktifkan jenis kendaraan?"} onClose={() => setStatusTarget(null)} busy={pending} footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => setStatusTarget(null)} disabled={pending}>Batal</Button><Button variant={statusTarget.aktif ? "destructive" : "default"} onClick={changeStatus} isLoading={pending}>{statusTarget.aktif ? "Nonaktifkan" : "Aktifkan"}</Button></div>}><p className="text-sm leading-6 text-slate-600">{statusTarget.aktif ? `${statusTarget.kategori} ${statusTarget.ukuran} tidak akan muncul sebagai pilihan transaksi baru. Histori lama tetap tersimpan.` : `${statusTarget.kategori} ${statusTarget.ukuran} akan kembali tersedia untuk transaksi baru.`}</p></Modal>}
  </div>
}
