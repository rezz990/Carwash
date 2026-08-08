import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { logout } from "../actions"
import { Button } from "@/components/ui/Button"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nama_lengkap, username")
    .eq("id", user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex-col hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-600 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.4-1.7-1-2.2l-3.3-2.5a2 2 0 0 0-1.2-.5H12M8 12h-3a1 1 0 0 0-1 1v4c0 .6.4 1 1 1h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/><path d="M12 11V3c0-.6-.4-1-1-1H3c-.6 0-1 .4-1 1v8"/><path d="M12 7H2"/></svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-indigo-950">POS Admin</h2>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Dashboard</p>
          </div>
        </div>
        
        <div className="px-6 py-5">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200/60 mb-6 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              {(profile?.nama_lengkap || profile?.username || 'A')[0].toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {profile?.nama_lengkap || profile?.username}
              </p>
              <p className="text-xs text-slate-500 font-medium">Administrator</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <Link href="/admin" className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/80 transition-all font-medium text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-indigo-600 transition-colors"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              Overview
            </Link>
            <Link href="/admin/tarif" className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/80 transition-all font-medium text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-indigo-600 transition-colors"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Kelola Tarif
            </Link>
            <Link href="/admin/users" className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/80 transition-all font-medium text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-indigo-600 transition-colors"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Kelola User
            </Link>
            <Link href="/admin/rekap" className="group flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/80 transition-all font-medium text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-indigo-600 transition-colors"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              Rekap Laporan
            </Link>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-100">
          <form action={logout}>
            <Button variant="outline" className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-colors h-11" type="submit">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
              Logout
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Decorative background blur */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10 transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none -z-10 transform -translate-x-1/3 translate-y-1/3" />
        
        {/* Mobile Header */}
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.4-1.7-1-2.2l-3.3-2.5a2 2 0 0 0-1.2-.5H12M8 12h-3a1 1 0 0 0-1 1v4c0 .6.4 1 1 1h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/><path d="M12 11V3c0-.6-.4-1-1-1H3c-.6 0-1 .4-1 1v8"/><path d="M12 7H2"/></svg>
            </div>
            <h1 className="text-md font-bold text-indigo-950">POS Admin</h1>
          </div>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit" className="text-slate-600 hover:text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </Button>
          </form>
        </header>

        <div className="p-6 md:p-8 lg:p-10 flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
