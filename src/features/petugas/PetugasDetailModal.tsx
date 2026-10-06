"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { Modal } from "@/components/ui/Modal"
import { EmptyState, ErrorNotice, LoadingState } from "@/components/ui/Feedback"
import { PaginationControls } from "@/components/ui/PaginationControls"
import { formatRupiah, formatTanggalPanjang, formatWaktu } from "@/lib/formatters"
import { fetchPetugasDetail } from "./actions"
import type { PetugasDetailResult } from "./actions"

function formatTerakhir(iso: string | null): string {
  if (!iso) return "Belum pernah bertugas"
  return `${formatTanggalPanjang(iso)} · ${formatWaktu(iso)} WIB`
}

export function PetugasDetailModal({ petugas, onClose }: {
  petugas: { id: string; nama: string }
  onClose: () => void
}) {
  const [result, setResult] = useState<PetugasDetailResult | null>(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  const load = useCallback((targetPage: number) => {
    startTransition(async () => {
      try {
        const res = await fetchPetugasDetail({ id: petugas.id, page: targetPage })
        if (res.error) {
          setError(res.error)
          return
        }
        setError("")
        setResult(res)
        setPage(res.page)
      } catch {
        setError("Detail petugas gagal dimuat. Periksa koneksi lalu coba lagi.")
      }
    })
  }, [petugas.id])

  useEffect(() => { load(1) }, [load])

  function changePage(target: number) {
    if (target === page || pending) return
    load(target)
  }

  const ringkasan = result?.ringkasan
  const pagination = result && result.total > 0
    ? <PaginationControls page={page} totalItems={result.total} pageSize={result.pageSize} onPageChange={changePage} />
    : null

  return <Modal title={`Statistik ${petugas.nama}`} description="Statistik dihitung dari transaksi yang mencatat petugas ini · WIB" onClose={onClose} busy={pending} wide fullScreenMobile
    footer={result && <p className="text-sm text-slate-500">{result.total} transaksi ditangani</p>}>
    {error && !result ? <ErrorNotice message={error} onRetry={() => load(page)} /> : <>
      {!ringkasan ? <LoadingState label="Memuat statistik petugas…" /> : <>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {([
            ["Total kendaraan", ringkasan.total],
            ["Mobil", ringkasan.mobil],
            ["Motor", ringkasan.motor],
            ["Hari ini", ringkasan.hari_ini],
            ["Minggu ini", ringkasan.minggu_ini],
            ["Bulan ini", ringkasan.bulan_ini],
          ] as const).map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3">
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 text-xl font-bold tracking-tight text-slate-950 tabular-nums">{value}</dd>
          </div>)}
        </dl>
        <p className="mt-3 text-xs leading-5 text-slate-500">Terakhir bertugas: <span className="font-medium text-slate-700">{formatTerakhir(ringkasan.terakhir)}</span></p>
      </>}

      <h3 className="mt-6 mb-3 text-sm font-bold text-slate-900">Riwayat transaksi</h3>
      {error && <div className="mb-3"><ErrorNotice message={error} onRetry={() => load(page)} /></div>}
      {pending && !result ? <LoadingState label="Memuat riwayat transaksi…" /> : !result ? null : result.riwayat.length === 0 ? <EmptyState title="Belum ada transaksi" description={`Transaksi yang ditangani ${petugas.nama} akan muncul di sini.`} /> : <>
        {pagination}
        <div className="space-y-3 md:hidden">{result.riwayat.map((t) => <article key={t.id} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">{!t.plat_nomor || t.plat_nomor === "B0000XX" ? "Tanpa plat" : t.plat_nomor}</p>
              <p className="mt-1 text-sm text-slate-500">{t.kategori} {t.ukuran}</p>
              <p className="mt-1 text-xs text-slate-500">{formatTanggalPanjang(t.tanggal_waktu)} · {formatWaktu(t.tanggal_waktu)} WIB</p>
            </div>
            <strong className="text-base tabular-nums">{formatRupiah(t.tarif_total)}</strong>
          </div>
          <p className="mt-3 text-xs text-slate-500">Kasir: <span className="font-medium text-slate-700">{t.kasir_nama || "—"}</span></p>
        </article>)}</div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full whitespace-nowrap text-sm">
          <thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-500">{["Waktu", "Kendaraan", "Plat", "Kasir", "Tarif"].map((label) => <th key={label} className="px-3 py-3 text-left font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{result.riwayat.map((t) => <tr key={t.id}>
            <td className="p-3">{formatTanggalPanjang(t.tanggal_waktu)} · {formatWaktu(t.tanggal_waktu)}</td>
            <td className="p-3">{t.kategori} {t.ukuran}</td>
            <td className="p-3 font-medium">{!t.plat_nomor || t.plat_nomor === "B0000XX" ? "Tanpa plat" : t.plat_nomor}</td>
            <td className="p-3">{t.kasir_nama || "—"}</td>
            <td className="p-3 tabular-nums">{formatRupiah(t.tarif_total)}</td>
          </tr>)}</tbody>
        </table></div>
        {pagination}
      </>}
      {pending && result && <p className="mt-2 text-xs text-slate-400">Memuat…</p>}
    </>}
  </Modal>
}
