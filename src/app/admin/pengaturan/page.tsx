import { createClient } from "@/utils/supabase/server"
import { PengaturanTabs } from "./PengaturanTabs"

export default async function PengaturanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("nama_lengkap")
    .eq("id", user?.id || "")
    .single()

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pengaturan</h1>
        <p className="text-slate-500 mt-2 text-base">
          Kelola akun Anda dan pengaturan sistem.
        </p>
      </div>

      <PengaturanTabs currentNama={profile?.nama_lengkap || ""} />
    </div>
  )
}