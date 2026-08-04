"use client"

import { useState, useEffect, useTransition } from "react"
import { submitTransaction } from "./actions"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card"
import { cn } from "@/utils/cn"

type JenisKendaraan = {
  id: string
  kategori: string
  ukuran: string
  tarif_default: number
}

type SplitConfig = {
  persen_karyawan: number
  persen_pemilik: number
}

export function TransactionForm({
  jenisKendaraan,
  splitConfig
}: {
  jenisKendaraan: JenisKendaraan[]
  splitConfig: SplitConfig
}) {
  const [now, setNow] = useState(new Date())
  const [selectedId, setSelectedId] = useState<string>("")
  const [platNomor, setPlatNomor] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [pending, startTransition] = useTransition()

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const selectedVehicle = jenisKendaraan.find(v => v.id === selectedId)
  const tarifTotal = selectedVehicle?.tarif_default || 0
  const jatahKaryawan = (tarifTotal * splitConfig.persen_karyawan) / 100
  const jatahPemilik = (tarifTotal * splitConfig.persen_pemilik) / 100

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId) {
      setError("Pilih jenis kendaraan terlebih dahulu")
      return
    }

    const formData = new FormData()
    formData.append("jenis_kendaraan_id", selectedId)
    if (platNomor) formData.append("plat_nomor", platNomor)

    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await submitTransaction(formData)
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setSuccess(true)
        setSelectedId("")
        setPlatNomor("")
        setTimeout(() => setSuccess(false), 3000)
      }
    })
  }

  // Group vehicles by kategori
  const motor = jenisKendaraan.filter(v => v.kategori.toLowerCase() === "motor")
  const mobil = jenisKendaraan.filter(v => v.kategori.toLowerCase() === "mobil")

  return (
    <Card className="shadow-xl shadow-indigo-100/50 border-indigo-50">
      <CardHeader className="bg-indigo-50/50 rounded-t-2xl border-b border-indigo-50 pb-6">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl text-indigo-950">Transaksi Baru</CardTitle>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-500">{now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
            <div className="text-2xl font-bold tracking-tight text-indigo-600 font-mono">{now.toLocaleTimeString('id-ID')}</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-8">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-4 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Transaksi berhasil disimpan!
          </div>
        )}

        <form id="transaction-form" onSubmit={onSubmit} className="space-y-8">
          <div className="space-y-4">
            <label className="text-base font-semibold text-slate-900">Jenis Kendaraan</label>
            
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Motor</div>
              <div className="grid grid-cols-2 gap-3">
                {motor.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    className={cn(
                      "h-20 sm:h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1",
                      selectedId === v.id 
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/10" 
                        : "border-slate-100 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50"
                    )}
                  >
                    <span className="font-semibold text-lg">{v.ukuran}</span>
                    <span className="text-sm opacity-80">{formatRupiah(v.tarif_default)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Mobil</div>
              <div className="grid grid-cols-3 gap-3">
                {mobil.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    className={cn(
                      "h-20 sm:h-24 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1",
                      selectedId === v.id 
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/10" 
                        : "border-slate-100 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50"
                    )}
                  >
                    <span className="font-semibold text-lg sm:text-xl">{v.ukuran}</span>
                    <span className="text-sm opacity-80 sm:block hidden">{formatRupiah(v.tarif_default)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label htmlFor="plat" className="text-base font-semibold text-slate-900 flex justify-between">
              Plat Nomor
              <span className="text-sm font-normal text-slate-500">Opsional</span>
            </label>
            <Input 
              id="plat"
              value={platNomor}
              onChange={e => setPlatNomor(e.target.value.toUpperCase())}
              placeholder="Contoh: B 1234 ABC"
              className="h-14 text-lg font-medium tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
            />
          </div>
        </form>

        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-4">
          <div className="flex justify-between items-center text-slate-600">
            <span>Tarif Total</span>
            <span className="text-xl font-bold text-slate-900">{formatRupiah(tarifTotal)}</span>
          </div>
          <div className="h-px bg-slate-200 w-full"></div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Jatah Karyawan ({splitConfig.persen_karyawan}%)</span>
            <span className="font-semibold text-emerald-600">{formatRupiah(jatahKaryawan)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Jatah Pemilik ({splitConfig.persen_pemilik}%)</span>
            <span className="font-semibold text-indigo-600">{formatRupiah(jatahPemilik)}</span>
          </div>
        </div>

      </CardContent>
      <CardFooter className="bg-slate-50 rounded-b-2xl border-t border-slate-100 pt-6">
        <Button 
          form="transaction-form" 
          type="submit" 
          disabled={pending || !selectedId} 
          size="lg" 
          className="w-full text-lg shadow-lg shadow-indigo-500/20"
        >
          {pending ? "Menyimpan..." : "Simpan Transaksi"}
        </Button>
      </CardFooter>
    </Card>
  )
}
