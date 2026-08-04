import { createClient } from "@/utils/supabase/server"
import { TransactionForm } from "./TransactionForm"
import { logout } from "./actions"
import { Button } from "@/components/ui/Button"

export default async function Home() {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("nama_lengkap, role, username")
    .eq("id", user.id)
    .single()

  // Fetch jenis_kendaraan
  const { data: jenisKendaraan } = await supabase
    .from("jenis_kendaraan")
    .select("*")
    .eq("aktif", true)
    .order("kategori", { ascending: false }) // Motor first
    .order("ukuran", { ascending: true })

  // Fetch konfigurasi_split
  const { data: splitConfig } = await supabase
    .from("konfigurasi_split")
    .select("persen_karyawan, persen_pemilik")
    .order("berlaku_sejak", { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.4-1.7-1-2.2l-3.3-2.5a2 2 0 0 0-1.2-.5H12M8 12h-3a1 1 0 0 0-1 1v4c0 .6.4 1 1 1h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/><path d="M12 11V3c0-.6-.4-1-1-1H3c-.6 0-1 .4-1 1v8"/><path d="M12 7H2"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-indigo-950 leading-tight">POS Carwash</h1>
            <p className="text-xs text-slate-500">
              Kasir: <span className="font-medium text-slate-700">{profile?.nama_lengkap || profile?.username || user.email?.split('@')[0]}</span>
            </p>
          </div>
        </div>
        <form action={logout}>
          <Button variant="outline" size="sm" type="submit" className="text-slate-600">Logout</Button>
        </form>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <TransactionForm 
          jenisKendaraan={jenisKendaraan || []} 
          splitConfig={splitConfig || { persen_karyawan: 30, persen_pemilik: 70 }} 
        />
      </main>
    </div>
  )
}
