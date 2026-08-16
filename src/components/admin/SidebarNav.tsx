"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/utils/cn"
import { motion } from "framer-motion"

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  /** Jika true, hanya exact match yang dianggap aktif */
  exact?: boolean
}

const navItems: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    exact: true,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1"/>
        <rect width="7" height="5" x="14" y="3" rx="1"/>
        <rect width="7" height="9" x="14" y="12" rx="1"/>
        <rect width="7" height="5" x="3" y="16" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/admin/tarif",
    label: "Kelola Tarif",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="2" y2="22"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Kelola User",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: "/admin/rekap",
    label: "Rekap Laporan",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="m19 9-5 5-4-4-3 3"/>
      </svg>
    ),
  },
  {
    href: "/admin/pengaturan",
    label: "Pengaturan",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

/** Sidebar nav — desktop vertical list dengan active route highlight */
export function SidebarNav() {
  const pathname = usePathname()

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + "/")
  }

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active = isActive(item)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group relative flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors duration-200 overflow-hidden",
              active
                ? "bg-indigo-50 text-indigo-700 shadow-sm nav-active-pill"
                : "text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/60"
            )}
          >
            {/* Active indicator dengan motion — hanya di desktop */}
            {active && (
              <motion.div
                layoutId="activeNav"
                className="absolute inset-0 bg-indigo-50 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            
            <span
              className={cn(
                "shrink-0 transition-colors duration-200",
                active ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500"
              )}
            >
              {item.icon}
            </span>
            <span className={cn(active ? "font-semibold" : "")}>
              {item.label}
            </span>
            {active && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

/** Mobile nav — horizontal scrollable pill buttons */
export function MobileNav() {
  const pathname = usePathname()

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + "/")
  }

  const labelShort: Record<string, string> = {
    "/admin": "Overview",
    "/admin/tarif": "Tarif",
    "/admin/users": "User",
    "/admin/rekap": "Rekap",
    "/admin/pengaturan": "Setting",
  }

  return (
    <div className="flex items-center gap-1 min-w-max">
      {navItems.map((item) => {
        const active = isActive(item)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200",
              active
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
            )}
          >
            {labelShort[item.href] ?? item.label}
          </Link>
        )
      })}
    </div>
  )
}
