import { TarifTable } from "@/features/tarif/TarifTable"
import { fetchJenisKendaraan } from "@/features/tarif/actions"

export default async function TarifPage() {
  const { data, error: loadError } = await fetchJenisKendaraan()

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
      <header>
        <p className="text-sm font-medium text-slate-500">Layanan dan pembagian</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Kelola tarif</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Atur harga dan bagian karyawan. Bagian pemilik dihitung otomatis agar jumlahnya selalu sama dengan tarif total.
        </p>
      </header>
      <TarifTable data={data} loadError={loadError} />
    </div>
  )
}
