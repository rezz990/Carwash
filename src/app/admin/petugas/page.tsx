import { PetugasTable } from "@/features/petugas/PetugasTable"
import { fetchPetugas } from "@/features/petugas/actions"

export default async function PetugasPage() {
  const { data, summary, error: loadError } = await fetchPetugas()

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
      <header>
        <p className="text-sm font-medium text-slate-500">Data operasional</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Kelola petugas cuci</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Setiap transaksi kasir mencatat satu petugas cuci. Statistik dihitung langsung dari transaksi tersebut. Petugas yang dinonaktifkan tidak muncul lagi di aplikasi kasir, tetapi histori transaksi lama tetap tersimpan.
        </p>
      </header>
      <PetugasTable data={data} summary={summary} loadError={loadError} />
    </div>
  )
}
