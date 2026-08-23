"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  fetchActivityLogs,
  type ActivityLogRow,
  type ActivityLogFilters,
} from "./actions"
import { todayWib, addWibDays } from "@/lib/formatters"
import { BUSINESS_TIMEZONE } from "@/lib/datetime"
import { parseUserAgent } from "@/lib/userAgent"

const ACTION_OPTIONS = [
  { value: "all", label: "Semua aksi" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "CREATE", label: "Tambah" },
  { value: "UPDATE", label: "Ubah" },
  { value: "DELETE", label: "Hapus" },
  { value: "EXPORT", label: "Export" },
  { value: "PRINT", label: "Print" },
]

const ENTITY_OPTIONS = [
  { value: "all", label: "Semua jenis" },
  { value: "transaksi", label: "Transaksi" },
  { value: "tarif", label: "Tarif" },
  { value: "user", label: "User" },
  { value: "pengaturan", label: "Pengaturan" },
  { value: "laporan", label: "Laporan" },
  { value: "auth", label: "Auth" },
]

const ACTION_STYLE: Record<string, string> = {
  LOGIN: "bg-sky-50 text-sky-700 border-sky-200",
  LOGOUT: "bg-slate-100 text-slate-600 border-slate-200",
  CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UPDATE: "bg-amber-50 text-amber-700 border-amber-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
  EXPORT: "bg-indigo-50 text-indigo-700 border-indigo-200",
  PRINT: "bg-purple-50 text-purple-700 border-purple-200",
}

function formatWaktuLengkap(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: BUSINESS_TIMEZONE,
  })
}

function DetailModal({ row, onClose }: { row: ActivityLogRow; onClose: () => void }) {
  const userAgentInfo = parseUserAgent(row.user_agent)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-slate-900">Detail Aktivitas</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
          </button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs mb-1">Deskripsi</p>
            <p className="text-slate-900 font-medium">{row.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-500 text-xs mb-1">Waktu</p>
              <p className="text-slate-900">{formatWaktuLengkap(row.created_at)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Aksi</p>
              <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${ACTION_STYLE[row.action] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                {row.action}
              </span>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Pelaku</p>
              <p className="text-slate-900">{row.user_name ?? "-"} {row.user_role ? `(${row.user_role})` : ""}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Jenis data</p>
              <p className="text-slate-900">{row.entity_type}{row.entity_id ? ` #${row.entity_id.slice(0, 8)}` : ""}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">IP Address</p>
              <p className="text-slate-900">{row.ip_address ?? "-"}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <p className="text-slate-700 text-xs mb-2 font-semibold">Informasi Perangkat</p>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div>
                <p className="text-slate-500 text-xs mb-1">Tipe perangkat</p>
                <p className="text-slate-900">{userAgentInfo.deviceType}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Perangkat</p>
                <p className="text-slate-900">{userAgentInfo.device}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Sistem operasi</p>
                <p className="text-slate-900">{userAgentInfo.operatingSystem}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Browser / aplikasi</p>
                <p className="text-slate-900">{userAgentInfo.browser}</p>
              </div>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">Lihat User Agent asli</summary>
              <p className="mt-2 rounded-lg bg-slate-100 p-3 text-[11px] text-slate-600 break-all">{row.user_agent ?? "Tidak tersedia"}</p>
            </details>
          </div>

          {(row.old_value != null || row.new_value != null) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              {row.old_value != null && (
                <div>
                  <p className="text-slate-500 text-xs mb-1.5 font-semibold">Sebelum</p>
                  <pre className="bg-red-50/60 border border-red-100 rounded-lg p-3 text-[11px] text-red-900 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(row.old_value, null, 2)}
                  </pre>
                </div>
              )}
              {row.new_value != null && (
                <div>
                  <p className="text-slate-500 text-xs mb-1.5 font-semibold">Sesudah</p>
                  <pre className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-3 text-[11px] text-emerald-900 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(row.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ActivityLogTable({
  userOptions,
}: {
  userOptions: { id: string; label: string }[]
}) {
  const PAGE_SIZE = 50

  const [dateFrom, setDateFrom] = useState(addWibDays(todayWib(), -7))
  const [dateTo, setDateTo] = useState(todayWib())
  const [action, setAction] = useState<string>("all")
  const [entityType, setEntityType] = useState<string>("all")
  const [userId, setUserId] = useState<string>("all")
  const [search, setSearch] = useState("")

  const [rows, setRows] = useState<ActivityLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<ActivityLogRow | null>(null)

  const load = useCallback(
    (targetPage: number) => {
      const filters: ActivityLogFilters = {
        page: targetPage,
        dateFrom,
        dateTo,
        action: action as ActivityLogFilters["action"],
        entityType,
        userId,
        search,
      }
      startTransition(async () => {
        const result = await fetchActivityLogs(filters)
        if (result.error) {
          setError(result.error)
          setRows([])
          setTotal(0)
          return
        }
        setError(null)
        setRows(result.data)
        setTotal(result.total)
        setPage(result.page)
      })
    },
    [dateFrom, dateTo, action, entityType, userId, search]
  )

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleApplyFilter() {
    load(1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="col-span-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Dari</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 text-sm" />
          </div>
          <div className="col-span-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Sampai</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 text-sm" />
          </div>
          <div className="col-span-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Aksi</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50"
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Jenis data</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50"
            >
              {ENTITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block">User</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50"
            >
              <option value="all">Semua user</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-medium text-slate-500 mb-1 block">Cari</label>
            <Input
              placeholder="Deskripsi / ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilter()}
              className="h-10 text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={handleApplyFilter} isLoading={isPending}>
            Terapkan Filter
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Waktu (WIB)</th>
                <th className="px-4 py-3 font-medium">Aksi</th>
                <th className="px-4 py-3 font-medium">Pelaku</th>
                <th className="px-4 py-3 font-medium">Deskripsi</th>
                <th className="px-4 py-3 font-medium text-right">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !isPending && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    Belum ada aktivitas untuk filter ini.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-xs">
                    {formatWaktuLengkap(row.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${ACTION_STYLE[row.action] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                    {row.user_name ?? <span className="text-slate-400">Sistem</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-md truncate">{row.description}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelected(row)}
                      className="text-yellow-600 hover:text-yellow-700 font-medium text-xs"
                    >
                      Lihat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Halaman <span className="font-medium text-slate-700">{page}</span> dari{" "}
              <span className="font-medium text-slate-700">{totalPages}</span> ({total} log)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || isPending} onClick={() => load(page - 1)}>
                Sebelumnya
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages || isPending} onClick={() => load(page + 1)}>
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {selected && <DetailModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
