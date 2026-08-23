import { getCurrentUser } from "@/lib/authz"
import { ActivityLogTable } from "./ActivityLogTable"
import { fetchActivityLogUserOptions } from "./actions"

export default async function LogAktivitasPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "admin") return null

  const userOptions = await fetchActivityLogUserOptions()

  return (
    <div className="space-y-5 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out min-w-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Log Aktivitas</h1>
        <p className="text-slate-500 mt-1.5 sm:mt-2 text-sm sm:text-base">
          Riwayat semua aksi penting dalam waktu WIB. Setiap halaman menampilkan 50 log dan log lama dibersihkan otomatis.
        </p>
      </div>

      <ActivityLogTable userOptions={userOptions} />
    </div>
  )
}
