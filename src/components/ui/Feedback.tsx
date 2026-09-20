import { AlertCircle, Inbox, RefreshCw } from "lucide-react"
import { Button } from "./Button"

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
    <AlertCircle size={18} className="shrink-0" /><p className="min-w-0 flex-1">{message}</p>
    {onRetry && <Button type="button" variant="outline" onClick={onRetry}>Coba lagi</Button>}
  </div>
}
export function EmptyState({ title = "Belum ada data", description = "Data akan muncul di sini setelah tersedia." }: { title?: string; description?: string }) {
  return <div role="status" className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
    <Inbox size={26} className="mx-auto mb-3 text-slate-400" /><p className="font-semibold text-slate-800">{title}</p><p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{description}</p>
  </div>
}
export function LoadingState({ label = "Memuat data…" }: { label?: string }) {
  return <div role="status" className="flex items-center justify-center gap-2 rounded-xl bg-slate-100/80 px-4 py-8 text-sm text-slate-600"><RefreshCw size={17} className="animate-spin" />{label}</div>
}
