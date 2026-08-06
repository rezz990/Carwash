import { createClient } from "@/utils/supabase/server"
import { TarifTable } from "./TarifTable"

export default async function TarifPage() {
  const supabase = await createClient()

  const { data: jenisKendaraan, error } = await supabase
    .from("jenis_kendaraan")
    .select("id, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik, aktif")
    .order("kategori", { ascending: false }) // Motor first
    .order("ukuran", { ascending: true })

  if (error) {
    console.error("Fetch jenis_kendaraan error:", error)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Kelola Tarif</h1>
          <p className="text-slate-500 mt-2 text-base">
            Atur harga cuci & jatah karyawan per jenis kendaraan. Klik untuk mengedit langsung.
          </p>
        </div>
        <div className="shrink-0 hidden sm:flex items-center gap-2 bg-indigo-50/80 border border-indigo-200/60 rounded-xl px-4 py-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span className="text-xs font-medium text-indigo-700">Klik angka untuk edit</span>
        </div>
      </div>

      {/* Table */}
      <TarifTable data={jenisKendaraan || []} />
    </div>
  )
}