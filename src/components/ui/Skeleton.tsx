import { cn } from "@/utils/cn"

interface SkeletonProps {
  className?: string
  count?: number
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse bg-slate-200 rounded-lg",
            className
          )}
        />
      ))}
    </>
  )
}

// Card skeleton untuk dashboard
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2 w-full">
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-10 bg-slate-200 rounded-xl animate-pulse" />
      </div>
    </div>
  )
}