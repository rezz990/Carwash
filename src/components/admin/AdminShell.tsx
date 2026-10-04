import { LogoutButton } from "@/components/auth/LogoutButton"
import { IdleLogout } from "@/components/admin/IdleLogout"
import { NotificationCenter } from "@/components/admin/NotificationCenter"
import { MobileNav, SidebarNav } from "@/components/admin/SidebarNav"

function BrandMark({ className }: { className?: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="32" height="32" rx="8" fill="#FACC15" />
      <text x="16" y="22" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="18" fill="#000000">
        B
      </text>
    </svg>
  )
}

export function AdminShell({
  name,
  loginTimeoutMinutes,
  children,
}: {
  name: string
  loginTimeoutMinutes: number
  children: React.ReactNode
}) {
  return (
    <div className="h-dvh flex bg-slate-50 text-slate-900 font-sans selection:bg-yellow-200">
      <IdleLogout timeoutMinutes={loginTimeoutMinutes} />
      <aside className="w-72 bg-white border-r border-slate-200 flex-col hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400/20 rounded-xl flex items-center justify-center border border-yellow-400/30 text-yellow-600 shadow-sm">
            <BrandMark />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Bujon</h2>
            <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider">Dashboard</p>
          </div>
        </div>

        <div className="px-4 py-5 flex-1 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200/60 mb-5 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-900 flex items-center justify-center font-bold text-sm shadow-md shrink-0">
              {(name || "A")[0].toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
              <p className="text-xs text-slate-500 font-medium">Administrator</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400/50 shrink-0" title="Online" />
          </div>
          <SidebarNav />
        </div>

        <div className="p-4 border-t border-slate-100">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-dvh overflow-hidden relative min-w-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-yellow-400/5 rounded-full blur-3xl pointer-events-none -z-10 transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-3xl pointer-events-none -z-10 transform -translate-x-1/3 translate-y-1/3" />

        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex shrink-0 items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400/20 rounded-lg flex items-center justify-center text-yellow-600">
              <BrandMark />
            </div>
            <h1 className="text-md font-bold text-slate-900">Bujon</h1>
          </div>
          <div className="flex items-center gap-1">
            <MobileNav />
            <LogoutButton isMobile />
          </div>
        </header>

        <div className="admin-scroll p-4 sm:p-5 md:p-8 lg:p-10 flex-1 overflow-auto min-h-0 min-w-0">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>

      <NotificationCenter />
    </div>
  )
}
