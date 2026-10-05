"use client"

import { useState, useTransition } from "react"
import { Pencil, Plus, Power, UserRound } from "lucide-react"
import { useToast } from "@/components/toast/ToastProvider"
import { Button } from "@/components/ui/Button"
import { ErrorNotice } from "@/components/ui/Feedback"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { createPetugas, toggleAktifPetugas, updatePetugas } from "./actions"
import type { Petugas } from "./actions"
export type { Petugas } from "./actions"

function PetugasForm({ item, onClose, onSaved }: {
  item?: Petugas
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [nama, setNama] = useState(item?.nama ?? "")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (!nama.trim()) return setError("Nama petugas wajib diisi")

    startTransition(async () => {
      try {
        const result = item
          ? await updatePetugas(item.id, nama)
          : await createPetugas({ nama })
        if (result.error) return setError(result.error)
        onSaved(item ? `Nama petugas diperbarui menjadi ${nama.trim()}` : `Petugas ${nama.trim()} ditambahkan`)
      } catch {
        setError("Perubahan belum tersimpan. Periksa koneksi lalu coba lagi.")
      }
    })
  }

  return <Modal title={item ? `Edit ${item.nama}` : "Tambah petugas"} onClose={onClose} busy={pending} footer={<div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" onClick={onClose} disabled={pending}>Batal</Button><Button type="submit" form="petugas-form" isLoading={pending}>Simpan</Button></div>}>
    <form id="petugas-form" onSubmit={submit} className="space-y-4">
      {error && <ErrorNotice message={error} />}
      <div><label className="field-label" htmlFor="petugas-nama">Nama petugas</label><Input id="petugas-nama" maxLength={100} value={nama} onChange={(event) => setNama(event.target.value)} placeholder="Contoh: Budi" autoFocus /></div>
    </form>
  </Modal>
}

export function PetugasTable({ data, loadError }: { data: Petugas[]; loadError?: string }) {
  const [editor, setEditor] = useState<Petugas | "new" | null>(null)
  const [statusTarget, setStatusTarget] = useState<Petugas | null>(null)
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
        const result = await toggleAktifPetugas(target.id, !target.aktif)
        if (result.error) addToast(result.error, "error")
        else addToast(`${target.nama} ${target.aktif ? "dinonaktifkan" : "diaktifkan"}`, "success")
      } catch {
        addToast("Status belum berubah. Periksa koneksi lalu coba lagi.", "error")
      } finally {
        setStatusTarget(null)
      }
    })
  }

  return <div className="space-y-4">
    {loadError && <ErrorNotice message={loadError} />}
    <div className="flex justify-stretch sm:justify-end"><Button className="w-full sm:w-auto" onClick={() => setEditor("new")}><Plus size={18} /> Tambah petugas</Button></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.map((item) => <article key={item.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${item.aktif ? "border-slate-200" : "border-slate-200 opacity-70"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3"><span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${item.aktif ? "bg-yellow-50 text-yellow-700" : "bg-slate-100 text-slate-500"}`}><UserRound size={21} /></span><div className="min-w-0"><h2 className="truncate font-bold text-slate-900">{item.nama}</h2><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${item.aktif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.aktif ? "Aktif" : "Nonaktif"}</span></div></div>
          <button type="button" onClick={() => setEditor(item)} className="icon-button shrink-0" aria-label={`Edit petugas ${item.nama}`}><Pencil size={18} /></button>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-500">Transaksi tercatat</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">{item.total_transaksi}</p><p className="mt-2 text-xs leading-5 text-slate-500">Petugas yang sudah dipakai transaksi tidak dihapus, cukup dinonaktifkan.</p></div>
        <Button variant="outline" className={`mt-4 w-full ${item.aktif ? "text-red-700" : "text-emerald-700"}`} onClick={() => setStatusTarget(item)}><Power size={17} /> {item.aktif ? "Nonaktifkan" : "Aktifkan"}</Button>
      </article>)}
    </div>
    {!loadError && data.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">Belum ada petugas cuci.</div>}

    {editor && <PetugasForm item={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSaved={saved} />}
    {statusTarget && <Modal title={statusTarget.aktif ? "Nonaktifkan petugas?" : "Aktifkan petugas?"} onClose={() => setStatusTarget(null)} busy={pending} footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => setStatusTarget(null)} disabled={pending}>Batal</Button><Button variant={statusTarget.aktif ? "destructive" : "default"} onClick={changeStatus} isLoading={pending}>{statusTarget.aktif ? "Nonaktifkan" : "Aktifkan"}</Button></div>}><p className="text-sm leading-6 text-slate-600">{statusTarget.aktif ? `${statusTarget.nama} tidak akan muncul sebagai pilihan di aplikasi kasir. Histori transaksi lama tetap tersimpan.` : `${statusTarget.nama} akan kembali tersedia sebagai pilihan di aplikasi kasir.`}</p></Modal>}
  </div>
}
