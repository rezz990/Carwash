"use client"

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react"
import { ChevronRight, Filter, LoaderCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { DateRangeFields } from "@/components/ui/DateRangeFields"
import { ErrorNotice } from "@/components/ui/Feedback"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { BUSINESS_TIMEZONE, addJakartaDays, todayJakarta } from "@/lib/datetime"
import { parseUserAgent } from "@/lib/userAgent"
import { fetchActivityLogs, type ActivityLogFilters, type ActivityLogRow } from "./actions"

const actionOptions = [
  { value: "all", label: "Semua aksi" }, { value: "LOGIN", label: "Login" }, { value: "LOGOUT", label: "Logout" },
  { value: "CREATE", label: "Tambah" }, { value: "UPDATE", label: "Ubah" }, { value: "DELETE", label: "Hapus" },
  { value: "EXPORT", label: "Ekspor" }, { value: "PRINT", label: "Cetak" },
] as const
const entityOptions = [
  { value: "all", label: "Semua jenis" }, { value: "transaksi", label: "Transaksi" }, { value: "tarif", label: "Tarif" },
  { value: "user", label: "User" }, { value: "pengaturan", label: "Pengaturan" }, { value: "laporan", label: "Laporan" }, { value: "auth", label: "Autentikasi" },
]
const actionStyle: Record<string, string> = {
  LOGIN: "bg-sky-50 text-sky-700", LOGOUT: "bg-slate-100 text-slate-600", CREATE: "bg-emerald-50 text-emerald-700",
  UPDATE: "bg-amber-50 text-amber-700", DELETE: "bg-red-50 text-red-700", EXPORT: "bg-indigo-50 text-indigo-700", PRINT: "bg-purple-50 text-purple-700",
}

function time(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: BUSINESS_TIMEZONE })
}

function Badge({ action }: { action: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${actionStyle[action] ?? "bg-slate-100 text-slate-600"}`}>{action}</span>
}

function Filters({ dateFrom, dateTo, action, entityType, userId, search, userOptions, onDateFrom, onDateTo, onAction, onEntity, onUser, onSearch }: {
  dateFrom: string; dateTo: string; action: string; entityType: string; userId: string; search: string
  userOptions: { id: string; label: string }[]
  onDateFrom: (value:string)=>void; onDateTo:(value:string)=>void; onAction:(value:string)=>void; onEntity:(value:string)=>void; onUser:(value:string)=>void; onSearch:(value:string)=>void
}) {
  return <div className="grid gap-4 lg:grid-cols-3">
    <DateRangeFields from={dateFrom} to={dateTo} onFromChange={onDateFrom} onToChange={onDateTo} />
    <div className="grid grid-cols-2 gap-3"><label className="text-xs font-medium text-slate-500"><span className="mb-1.5 block">Aksi</span><select value={action} onChange={(event)=>onAction(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{actionOptions.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="text-xs font-medium text-slate-500"><span className="mb-1.5 block">Jenis data</span><select value={entityType} onChange={(event)=>onEntity(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{entityOptions.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><label className="text-xs font-medium text-slate-500"><span className="mb-1.5 block">User</span><select value={userId} onChange={(event)=>onUser(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">Semua user</option>{userOptions.map((option)=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="text-xs font-medium text-slate-500"><span className="mb-1.5 block">Cari</span><span className="relative block"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><Input value={search} onChange={(event)=>onSearch(event.target.value)} className="pl-9" placeholder="Deskripsi atau ID" /></span></label></div>
  </div>
}

function DetailModal({ row, onClose }: { row: ActivityLogRow; onClose: () => void }) {
  const device = parseUserAgent(row.user_agent)
  return <Modal title="Detail aktivitas" onClose={onClose} wide>
    <div className="space-y-5 text-sm"><div><p className="text-xs font-medium text-slate-500">Deskripsi</p><p className="mt-1 font-semibold leading-6 text-slate-900">{row.description}</p></div><dl className="grid grid-cols-2 gap-4 sm:grid-cols-3"><div><dt className="text-xs text-slate-500">Waktu (WIB)</dt><dd className="mt-1 text-slate-900">{time(row.created_at)}</dd></div><div><dt className="text-xs text-slate-500">Aksi</dt><dd className="mt-1"><Badge action={row.action}/></dd></div><div><dt className="text-xs text-slate-500">Pelaku</dt><dd className="mt-1 text-slate-900">{row.user_name ?? "Sistem"}{row.user_role ? ` (${row.user_role})` : ""}</dd></div><div><dt className="text-xs text-slate-500">Jenis data</dt><dd className="mt-1 break-anywhere text-slate-900">{row.entity_type}{row.entity_id ? ` · ${row.entity_id}` : ""}</dd></div><div><dt className="text-xs text-slate-500">Alamat IP</dt><dd className="mt-1 text-slate-900">{row.ip_address ?? "Tidak tersedia"}</dd></div></dl><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-700">Perangkat</p><dl className="mt-3 grid grid-cols-2 gap-3"><div><dt className="text-xs text-slate-500">Tipe</dt><dd className="mt-1">{device.deviceType}</dd></div><div><dt className="text-xs text-slate-500">Perangkat</dt><dd className="mt-1">{device.device}</dd></div><div><dt className="text-xs text-slate-500">Sistem</dt><dd className="mt-1">{device.operatingSystem}</dd></div><div><dt className="text-xs text-slate-500">Browser</dt><dd className="mt-1">{device.browser}</dd></div></dl><details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-slate-600">User agent asli</summary><p className="mt-2 break-all text-xs leading-5 text-slate-500">{row.user_agent ?? "Tidak tersedia"}</p></details></div>{(row.old_value != null || row.new_value != null) && <div className="grid gap-3 sm:grid-cols-2">{row.old_value != null && <div><p className="mb-1.5 text-xs font-semibold text-red-700">Sebelum</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-red-50 p-3 text-xs text-red-900">{JSON.stringify(row.old_value,null,2)}</pre></div>}{row.new_value != null && <div><p className="mb-1.5 text-xs font-semibold text-emerald-700">Sesudah</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">{JSON.stringify(row.new_value,null,2)}</pre></div>}</div>}</div>
  </Modal>
}

export function ActivityLogTable({ userOptions }: { userOptions: { id: string; label: string }[] }) {
  const [dateFrom,setDateFrom]=useState(addJakartaDays(todayJakarta(),-7)); const [dateTo,setDateTo]=useState(todayJakarta())
  const [action,setAction]=useState("all"); const [entityType,setEntityType]=useState("all"); const [userId,setUserId]=useState("all"); const [search,setSearch]=useState("")
  const [rows,setRows]=useState<ActivityLogRow[]>([]); const [total,setTotal]=useState(0); const [page,setPage]=useState(1); const [error,setError]=useState("")
  const [selected,setSelected]=useState<ActivityLogRow|null>(null); const [filterOpen,setFilterOpen]=useState(false); const [pending,startTransition]=useTransition(); const sequence=useRef(0)

  function load(targetPage:number) {
    const request=++sequence.current
    const filters:ActivityLogFilters={page:targetPage,dateFrom,dateTo,action:action as ActivityLogFilters["action"],entityType,userId,search}
    startTransition(async()=>{
      try { const result=await fetchActivityLogs(filters); if(request!==sequence.current)return; if(result.error){setError(result.error);setRows([]);setTotal(0)}else{setError("");setRows(result.data);setTotal(result.total);setPage(result.page)} }
      catch { if(request===sequence.current){setError("Log aktivitas gagal dimuat.");setRows([]);setTotal(0)} }
    })
  }
  const loadInitial=useEffectEvent(()=>load(1))
  useEffect(()=>{loadInitial()},[])
  const totalPages=Math.max(1,Math.ceil(total/50)); const activeFilterCount=[action!=="all",entityType!=="all",userId!=="all",Boolean(search.trim())].filter(Boolean).length
  const filterProps={dateFrom,dateTo,action,entityType,userId,search,userOptions,onDateFrom:setDateFrom,onDateTo:setDateTo,onAction:setAction,onEntity:setEntityType,onUser:setUserId,onSearch:setSearch}
  function apply(){load(1);setFilterOpen(false)}

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3 md:hidden"><p className="text-sm text-slate-500">{total.toLocaleString("id-ID")} aktivitas</p><Button variant="outline" onClick={()=>setFilterOpen(true)}><Filter size={17}/> Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}</Button></div>
    <section className="hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:block"><Filters {...filterProps}/><div className="mt-4 flex justify-end"><Button onClick={apply} isLoading={pending}>Terapkan filter</Button></div></section>
    {error&&<ErrorNotice message={error}/>}
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {pending&&<div className="absolute inset-x-0 top-0 z-10 flex justify-center bg-white/90 p-2"><span role="status" className="inline-flex items-center gap-2 text-xs font-medium text-slate-600"><LoaderCircle size={14} className="animate-spin"/> Memuat</span></div>}
      <div className="divide-y divide-slate-100 md:hidden">{rows.map((row)=><button key={row.id} type="button" onClick={()=>setSelected(row)} className="flex w-full items-start justify-between gap-3 p-4 text-left"><span className="min-w-0"><span className="flex items-center gap-2"><Badge action={row.action}/><span className="truncate text-xs text-slate-500">{row.user_name??"Sistem"}</span></span><span className="mt-2 block text-sm font-medium leading-5 text-slate-900">{row.description}</span><span className="mt-1 block text-xs text-slate-500">{time(row.created_at)}</span></span><ChevronRight size={18} className="mt-2 shrink-0 text-slate-400"/></button>)}</div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-4 py-3 font-medium">Waktu (WIB)</th><th className="px-4 py-3 font-medium">Aksi</th><th className="px-4 py-3 font-medium">Pelaku</th><th className="px-4 py-3 font-medium">Deskripsi</th><th className="px-4 py-3"><span className="sr-only">Detail</span></th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row)=><tr key={row.id}><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{time(row.created_at)}</td><td className="px-4 py-3"><Badge action={row.action}/></td><td className="whitespace-nowrap px-4 py-3">{row.user_name??"Sistem"}</td><td className="max-w-lg truncate px-4 py-3">{row.description}</td><td className="px-4 py-3 text-right"><button type="button" onClick={()=>setSelected(row)} className="min-h-11 px-2 text-sm font-semibold text-yellow-700">Lihat</button></td></tr>)}</tbody></table></div>
      {!pending&&rows.length===0&&<div className="px-5 py-12 text-center text-sm text-slate-500">Belum ada aktivitas untuk filter ini.</div>}
      {total>0&&<footer className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-center text-xs text-slate-500">Halaman {page} dari {totalPages} · {total.toLocaleString("id-ID")} log</p><div className="grid grid-cols-2 gap-2"><Button variant="outline" size="sm" disabled={page<=1||pending} onClick={()=>load(page-1)}>Sebelumnya</Button><Button variant="outline" size="sm" disabled={page>=totalPages||pending} onClick={()=>load(page+1)}>Berikutnya</Button></div></footer>}
    </section>
    {filterOpen&&<Modal title="Filter log aktivitas" onClose={()=>setFilterOpen(false)} footer={<div className="grid grid-cols-2 gap-3"><Button variant="outline" onClick={()=>setFilterOpen(false)}>Batal</Button><Button onClick={apply} isLoading={pending}>Terapkan</Button></div>}><Filters {...filterProps}/></Modal>}
    {selected&&<DetailModal row={selected} onClose={()=>setSelected(null)}/>}
  </div>
}
