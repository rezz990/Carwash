import { Skeleton } from "@/components/ui/Skeleton"

export default function LogAktivitasLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7" role="status" aria-label="Memuat log aktivitas">
      <header className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-48 sm:h-9" />
        <Skeleton className="h-4 w-full max-w-md" />
      </header>

      <section className="hidden rounded-2xl border border-slate-200 bg-white p-5 md:block">
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </section>

      <section className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Skeleton className="hidden h-11 w-full rounded-none md:block" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-3 w-32 md:hidden" />
            </div>
            <Skeleton className="hidden h-4 w-28 shrink-0 md:block" />
            <Skeleton className="hidden h-4 w-16 shrink-0 md:block" />
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 p-3">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </section>
    </div>
  )
}
