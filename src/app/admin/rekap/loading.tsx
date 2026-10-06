import { Skeleton, StatCardSkeleton } from "@/components/ui/Skeleton"

export default function RekapLoading() {
  return (
    <div className="space-y-5 sm:space-y-8" role="status" aria-label="Memuat rekap">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44 sm:h-9" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 w-24" />
            <Skeleton className="h-11 w-24" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:flex">
          <Skeleton className="h-11 w-full sm:w-24" />
          <Skeleton className="h-11 w-full sm:w-24" />
          <Skeleton className="h-11 w-full sm:w-24" />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-2xl" count={4} />
      </div>
    </div>
  )
}
