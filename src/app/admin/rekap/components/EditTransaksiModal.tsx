import { useState, useEffect, useRef, useTransition } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { updateTransaksi, type TransaksiDetail } from "../actions"

export function EditTransaksiModal({
  transaksi,
  jenisKendaraanList,
  onCancel,
  onSaved,
  onResult,
}: {
  transaksi: TransaksiDetail
  jenisKendaraanList: { id: string; kategori: string; ukuran: string }[]
  onCancel: () => void
  onSaved: () => void
  onResult: (msg: string, type: "success" | "error") => void
}) {
  const initialJenisId = jenisKendaraanList.find(
    (jk) => jk.kategori === transaksi.kategori && jk.ukuran === transaksi.ukuran
  )?.id || ""

  const [jenisId, setJenisId] = useState(initialJenisId)
  const [platNomor, setPlatNomor] = useState(transaksi.plat_nomor || "")
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const titleRef = useRef<HTMLHeadingElement>(null)
  const confirmTitleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  useEffect(() => {
    if (showConfirm) {
      confirmTitleRef.current?.focus()
    }
  }, [showConfirm])

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await updateTransaksi({
        id: transaksi.id,
        jenisKendaraanId: jenisId,
        platNomor: platNomor.trim() || null,
      })
      if (result.error) {
        setError(result.error)
        setShowConfirm(false)
      } else {
        onResult("Transaksi berhasil diperbarui", "success")
        onSaved()
      }
    })
  }

  if (showConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 animate-in zoom-in-95 duration-300">
          <div className="px-6 py-5 text-center">
            <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            </div>
            <h2
              ref={confirmTitleRef}
              tabIndex={-1}
              className="text-lg font-bold text-slate-900 outline-none"
            >
              Simpan perubahan?
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Tarif dan pembagian jatah karyawan/pemilik akan dihitung ulang otomatis sesuai jenis kendaraan yang dipilih.
            </p>
          </div>
          {error && (
            <div className="mx-6 mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl text-center">{error}</div>
          )}
          <div className="px-6 pb-6 flex gap-3 justify-center">
            <Button type="button" variant="outline" className="w-28" onClick={() => setShowConfirm(false)} disabled={isPending}>
              Kembali
            </Button>
            <Button type="button" className="w-28" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Menyimpan..." : "Ya, Simpan"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-300">
        <div className="px-6 py-5 border-b border-slate-100 text-center">
          <h2
            ref={titleRef}
            tabIndex={-1}
            className="text-lg font-bold text-slate-900 outline-none"
          >
            Edit Transaksi
          </h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5 text-center">
            <label className="text-sm font-medium text-slate-700">Jenis Kendaraan</label>
            <select
              value={jenisId}
              onChange={(e) => setJenisId(e.target.value)}
              className="w-full h-11 px-3 text-sm rounded-lg border border-slate-200 bg-white text-center"
            >
              {jenisKendaraanList.map((jk) => (
                <option key={jk.id} value={jk.id}>{jk.kategori} {jk.ukuran}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 text-center">
            <label className="text-sm font-medium text-slate-700">Plat Nomor</label>
            <Input
              value={platNomor}
              onChange={(e) => setPlatNomor(e.target.value.toUpperCase())}
              placeholder="Opsional"
              className="uppercase text-center"
            />
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-center">
          <Button type="button" variant="outline" className="w-28" onClick={onCancel}>
            Batal
          </Button>
          <Button type="button" className="w-28" onClick={() => setShowConfirm(true)} disabled={!jenisId}>
            Lanjutkan
          </Button>
        </div>
      </div>
    </div>
  )
}
