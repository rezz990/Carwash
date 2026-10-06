import { Skeleton, StatCardSkeleton } from "@/components/ui/Skeleton"

export default function AdminLoading() {
  return (
    <div className="space-y-5 sm:space-y-7" role="status" aria-label="Memuat halaman">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 sm:h-9" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      </section>
    </div>
  )
}
