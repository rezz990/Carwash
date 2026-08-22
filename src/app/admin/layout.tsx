import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationCenter } from "@/components/admin/NotificationCenter";
import { SidebarNav, MobileNav } from "@/components/admin/SidebarNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  const name = user.nama_lengkap || user.username;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex-col hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 text-indigo-600 shadow-sm">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="32" height="32" rx="8" fill="#FACC15" />
              <text
                x="16"
                y="22"
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontWeight="700"
                fontSize="18"
                fill="#000000"
              >
                B
              </text>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-indigo-950">
              Bujon
            </h2>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
              Dashboard
            </p>
          </div>
        </div>

        {/* User card + Nav */}
        <div className="px-4 py-5 flex-1 overflow-y-auto">
          {/* User card */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200/60 mb-5 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
              {(name || "A")[0].toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {name}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Administrator
              </p>
            </div>
            {/* Online indicator */}
            <div
              className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400/50 shrink-0"
              title="Online"
            />
          </div>

          {/* Navigation — client component untuk active state */}
          <SidebarNav />
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-slate-100">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0">
        {/* Decorative background blur */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -z-10 transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none -z-10 transform -translate-x-1/3 translate-y-1/3" />

        {/* Mobile Header */}
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-600">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="32" height="32" rx="8" fill="#FACC15" />
                <text
                  x="16"
                  y="22"
                  textAnchor="middle"
                  fontFamily="Arial, sans-serif"
                  fontWeight="700"
                  fontSize="18"
                  fill="#000000"
                >
                  B
                </text>
              </svg>
            </div>
            <h1 className="text-md font-bold text-indigo-950">Bujon</h1>
          </div>
          <LogoutButton isMobile />
        </header>

        {/* Mobile navigation — client component untuk active state */}
        <nav className="md:hidden sticky top-[65px] z-10 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2 overflow-x-auto">
          <MobileNav />
        </nav>

        <div className="p-4 sm:p-5 md:p-8 lg:p-10 flex-1 overflow-auto min-w-0">
          <div className="max-w-6xl mx-auto animate-page-enter">{children}</div>
        </div>
      </main>

      {/* Notifikasi realtime (toast + suara) untuk transaksi baru - dipasang
          di sini (level layout) supaya muncul di halaman admin manapun */}
      <NotificationCenter />
    </div>
  );
}
