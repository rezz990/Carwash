import { getCurrentUser } from "@/lib/authz"
import { ActivityLogTable } from "./ActivityLogTable"
import { fetchActivityLogUserOptions } from "./actions"

export default async function LogAktivitasPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "admin") return null

  const userOptions = await fetchActivityLogUserOptions()

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
      <header>
        <p className="text-sm font-medium text-slate-500">Audit sistem</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Log aktivitas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Riwayat aksi penting dalam WIB. Detail perubahan dan perangkat dapat diperiksa per aktivitas.</p>
      </header>

      <ActivityLogTable userOptions={userOptions} />
    </div>
  )
}
