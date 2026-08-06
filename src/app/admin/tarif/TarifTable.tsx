"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { updateTarifDefault, toggleAktifJenisKendaraan } from "./actions"

type JenisKendaraan = {
  id: string
  kategori: string
  ukuran: string
  tarif_default: number
  jatah_karyawan: number
  jatah_pemilik: number
  aktif: boolean
}

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300 ${
      type === "success" 
        ? "bg-emerald-50/95 border-emerald-200 text-emerald-800" 
        : "bg-red-50/95 border-red-200 text-red-800"
    }`}>
      {type === "success" ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
      )}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-current opacity-50 hover:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
      </button>
    </div>
  )
}

// Format rupiah
function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Inline editable tarif + jatah karyawan cell (jatah pemilik dihitung otomatis)
function TarifCell({ item, onResult }: { item: JenisKendaraan; onResult: (msg: string, type: "success" | "error") => void }) {
  const [editing, setEditing] = useState(false)
  const [tarif, setTarif] = useState(item.tarif_default.toString())
  const [jatahKaryawan, setJatahKaryawan] = useState(item.jatah_karyawan.toString())
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  // Sync state kalau props berubah dari server (setelah revalidation)
  useEffect(() => {
    if (!editing) {
      setTarif(item.tarif_default.toString())
      setJatahKaryawan(item.jatah_karyawan.toString())
    }
  }, [item.tarif_default, item.jatah_karyawan, editing])

  const tarifNum = parseFloat(tarif) || 0
  const jatahKaryawanNum = parseFloat(jatahKaryawan) || 0
  const jatahPemilikPreview = tarifNum - jatahKaryawanNum

  const handleSave = () => {
    const tarifVal = parseFloat(tarif)
    const jatahVal = parseFloat(jatahKaryawan)

    if (isNaN(tarifVal) || tarifVal < 0) {
      onResult("Tarif harus berupa angka positif", "error")
      resetValues()
      return
    }
    if (isNaN(jatahVal) || jatahVal < 0) {
      onResult("Jatah karyawan harus berupa angka positif", "error")
      resetValues()
      return
    }
    if (jatahVal > tarifVal) {
      onResult("Jatah karyawan tidak boleh melebihi tarif total", "error")
      resetValues()
      return
    }

    // Kalau tidak ada perubahan, skip update
    if (tarifVal === item.tarif_default && jatahVal === item.jatah_karyawan) {
      setEditing(false)
      return
    }

    startTransition(async () => {
      const result = await updateTarifDefault(item.id, tarifVal, jatahVal)
      if (result.error) {
        onResult(result.error, "error")
        resetValues()
      } else {
        onResult(`Tarif ${item.kategori} ${item.ukuran} berhasil diperbarui`, "success")
      }
      setEditing(false)
    })
  }

  const resetValues = () => {
    setTarif(item.tarif_default.toString())
    setJatahKaryawan(item.jatah_karyawan.toString())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave()
    if (e.key === "Escape") {
      resetValues()
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 py-1">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">Tarif</span>
            <Input
              ref={inputRef}
              type="number"
              min="0"
              step="1000"
              value={tarif}
              onChange={(e) => setTarif(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
              className="w-36 h-9 pl-14 text-sm bg-white border-indigo-300 focus-visible:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">Jatah Kry</span>
            <Input
              type="number"
              min="0"
              step="1000"
              value={jatahKaryawan}
              onChange={(e) => setJatahKaryawan(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              disabled={isPending}
              className="w-40 h-9 pl-20 text-sm bg-white border-indigo-300 focus-visible:ring-indigo-500"
            />
          </div>
          {isPending && (
            <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          )}
        </div>
        <span className="text-xs text-slate-400 pl-1">
          Jatah pemilik: <span className="font-medium text-slate-600">{formatRupiah(Math.max(jatahPemilikPreview, 0))}</span> (otomatis)
        </span>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex flex-col items-start gap-0.5 px-3 py-2 -mx-3 -my-2 rounded-lg hover:bg-indigo-50/80 transition-colors cursor-pointer text-left"
      title="Klik untuk edit tarif & jatah karyawan"
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-900 tabular-nums">
          {formatRupiah(item.tarif_default)}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-indigo-500 transition-colors"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
      </div>
      <span className="text-xs text-slate-400 tabular-nums">
        Kry {formatRupiah(item.jatah_karyawan)} · Pemilik {formatRupiah(item.jatah_pemilik)}
      </span>
    </button>
  )
}

// Toggle switch component
function ToggleSwitch({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-indigo-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  )
}

// Status badge
function StatusBadge({ aktif }: { aktif: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
      aktif 
        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
        : "bg-slate-100 text-slate-500 border border-slate-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${aktif ? "bg-emerald-500" : "bg-slate-400"}`} />
      {aktif ? "Aktif" : "Nonaktif"}
    </span>
  )
}

// Kategori icon
function KategoriIcon({ kategori }: { kategori: string }) {
  if (kategori === "Motor") {
    return (
      <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200/60 flex items-center justify-center text-sky-600">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.4-1.7-1-2.2l-3.3-2.5a2 2 0 0 0-1.2-.5H12M8 12h-3a1 1 0 0 0-1 1v4c0 .6.4 1 1 1h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/><path d="M12 11V3c0-.6-.4-1-1-1H3c-.6 0-1 .4-1 1v8"/><path d="M12 7H2"/></svg>
    </div>
  )
}

export function TarifTable({ data }: { data: JenisKendaraan[] }) {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type })
  }

  const handleToggle = (item: JenisKendaraan, newVal: boolean) => {
    setPendingToggles(prev => new Set(prev).add(item.id))
    startTransition(async () => {
      const result = await toggleAktifJenisKendaraan(item.id, newVal)
      if (result.error) {
        showToast(result.error, "error")
      } else {
        showToast(
          `${item.kategori} ${item.ukuran} ${newVal ? "diaktifkan" : "dinonaktifkan"}`,
          "success"
        )
      }
      setPendingToggles(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    })
  }

  // Kelompokkan data berdasarkan kategori
  const motorData = data.filter((d) => d.kategori === "Motor")
  const mobilData = data.filter((d) => d.kategori === "Mobil")

  const renderGroup = (title: string, items: JenisKendaraan[]) => (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-3.5 border-b border-slate-200/60">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-4 px-6 py-4 transition-colors ${
              !item.aktif ? "bg-slate-50/50" : "hover:bg-slate-50/40"
            }`}
          >
            <KategoriIcon kategori={item.kategori} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <span className={`font-semibold text-sm ${!item.aktif ? "text-slate-400" : "text-slate-900"}`}>
                  {item.kategori} {item.ukuran}
                </span>
                <StatusBadge aktif={item.aktif} />
              </div>
            </div>

            <div className={`${!item.aktif ? "opacity-50" : ""}`}>
              <TarifCell item={item} onResult={showToast} />
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-slate-100">
              <ToggleSwitch
                checked={item.aktif}
                disabled={pendingToggles.has(item.id)}
                onChange={(val) => handleToggle(item, val)}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-6 py-8 text-center text-slate-400 text-sm">
            Tidak ada data
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {renderGroup("Motor", motorData)}
      {renderGroup("Mobil", mobilData)}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}