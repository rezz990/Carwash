import { PengaturanTabs } from "@/features/settings/PengaturanTabs"
import { getCurrentUser } from "@/lib/authz"
import { getLoginTimeoutMinutes } from "@/lib/loginTimeout"

export default async function PengaturanPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "admin") return null

  const loginTimeoutMinutes = await getLoginTimeoutMinutes()

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
      <header>
        <p className="text-sm font-medium text-slate-500">Akun dan sistem</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Pengaturan</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Kelola profil, keamanan sesi, notifikasi perangkat, dan salinan transaksi.
        </p>
      </header>
      <PengaturanTabs
        currentNama={currentUser.nama_lengkap ?? ""}
        currentUsername={currentUser.username}
        loginTimeoutMinutes={loginTimeoutMinutes}
      />
    </div>
  )
}
