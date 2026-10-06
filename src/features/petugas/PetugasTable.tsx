"use client"

import { useState, useTransition } from "react"
import { Bike, Car, Droplets, Pencil, Plus, Power, UserCheck, UserRound, UserX, Users } from "lucide-react"
import { useToast } from "@/components/toast/ToastProvider"
import { Button } from "@/components/ui/Button"
import { ErrorNotice } from "@/components/ui/Feedback"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { formatTanggalPanjang, formatWaktu } from "@/lib/formatters"
import { createPetugas, toggleAktifPetugas, updatePetugas } from "./actions"
import { PetugasDetailModal } from "./PetugasDetailModal"
import type { Petugas, PetugasSummary } from "./actions"
export type { Petugas } from "./actions"

function SummaryMetric({ label, value, icon: Icon, tone = "slate" }: {
  label: string
  value: number
  icon: React.ElementType
  tone?: "slate" | "green" | "red" | "amber" | "blue"
}) {
  const color = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-sky-50 text-sky-700",
  }[tone]
  return <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs font-medium leading-5 text-slate-500 sm:text-sm">{label}</p>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={18} /></span>
    </div>
    <p className="mt-2 text-xl font-bold tracking-tight text-slate-950 tabular-nums sm:text-2xl">{value}</p>
  </article>
}

function PetugasSummarySection({ summary }: { summary: PetugasSummary }) {
  return <section aria-label="Ringkasan petugas cuci" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
    <SummaryMetric label="Total petugas" value={summary.total_petugas} icon={Users} />
    <SummaryMetric label="Petugas aktif" value={summary.petugas_aktif} icon={UserCheck} tone="green" />
    <SummaryMetric label="Petugas nonaktif" value={summary.petugas_nonaktif} icon={UserX} tone="red" />
    <SummaryMetric label="Cuci hari ini" value={summary.cuci_hari_ini} icon={Droplets} tone="blue" />
    <SummaryMetric label="Mobil hari ini" value={summary.mobil_hari_ini} icon={Car} tone="amber" />
    <SummaryMetric label="Motor hari ini" value={summary.motor_hari_ini} icon={Bike} tone="amber" />
  </section>
}

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

export function PetugasTable({ data, summary, loadError }: { data: Petugas[]; summary: PetugasSummary; loadError?: string }) {
  const [editor, setEditor] = useState<Petugas | "new" | null>(null)
  const [statusTarget, setStatusTarget] = useState<Petugas | null>(null)
  const [detailTarget, setDetailTarget] = useState<Petugas | null>(null)
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
    <PetugasSummarySection summary={summary} />
    <div className="flex justify-stretch sm:justify-end"><Button className="w-full sm:w-auto" onClick={() => setEditor("new")}><Plus size={18} /> Tambah petugas</Button></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.map((item) => <article key={item.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${item.aktif ? "border-slate-200" : "border-slate-200 opacity-70"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3"><span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${item.aktif ? "bg-yellow-50 text-yellow-700" : "bg-slate-100 text-slate-500"}`}><UserRound size={21} /></span><div className="min-w-0"><h2 className="truncate font-bold text-slate-900">{item.nama}</h2><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${item.aktif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.aktif ? "Aktif" : "Nonaktif"}</span></div></div>
          <button type="button" onClick={() => setEditor(item)} className="icon-button shrink-0" aria-label={`Edit petugas ${item.nama}`}><Pencil size={18} /></button>
        </div>
        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
          <div>
            <p className="text-xs font-medium text-slate-500">Total kendaraan ditangani</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 tabular-nums">{item.total_transaksi}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div><dt className="text-xs text-slate-500">Mobil</dt><dd className="font-semibold tabular-nums text-slate-900">{item.total_mobil}</dd></div>
            <div><dt className="text-xs text-slate-500">Motor</dt><dd className="font-semibold tabular-nums text-slate-900">{item.total_motor}</dd></div>
            <div><dt className="text-xs text-slate-500">Hari ini</dt><dd className="font-semibold tabular-nums text-slate-900">{item.hari_ini}</dd></div>
            <div><dt className="text-xs text-slate-500">Bulan ini</dt><dd className="font-semibold tabular-nums text-slate-900">{item.bulan_ini}</dd></div>
          </dl>
          <p className="text-xs leading-5 text-slate-500">Terakhir bertugas: <span className="font-medium text-slate-700">{item.terakhir_transaksi ? `${formatTanggalPanjang(item.terakhir_transaksi)} · ${formatWaktu(item.terakhir_transaksi)} WIB` : "Belum pernah"}</span></p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setDetailTarget(item)}>Lihat statistik</Button>
          <Button variant="outline" className={item.aktif ? "text-red-700" : "text-emerald-700"} onClick={() => setStatusTarget(item)}><Power size={17} /> {item.aktif ? "Nonaktifkan" : "Aktifkan"}</Button>
        </div>
      </article>)}
    </div>
    {!loadError && data.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">Belum ada petugas cuci.</div>}

    {editor && <PetugasForm item={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} onSaved={saved} />}
    {statusTarget && <Modal title={statusTarget.aktif ? "Nonaktifkan petugas?" : "Aktifkan petugas?"} onClose={() => setStatusTarget(null)} busy={pending} footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={() => setStatusTarget(null)} disabled={pending}>Batal</Button><Button variant={statusTarget.aktif ? "destructive" : "default"} onClick={changeStatus} isLoading={pending}>{statusTarget.aktif ? "Nonaktifkan" : "Aktifkan"}</Button></div>}><p className="text-sm leading-6 text-slate-600">{statusTarget.aktif ? `${statusTarget.nama} tidak akan muncul sebagai pilihan di aplikasi kasir. Histori transaksi lama tetap tersimpan.` : `${statusTarget.nama} akan kembali tersedia sebagai pilihan di aplikasi kasir.`}</p></Modal>}
    {detailTarget && <PetugasDetailModal petugas={detailTarget} onClose={() => setDetailTarget(null)} />}
  </div>
}
