import * as React from "react"
import { cn } from "@/utils/cn"

/**
 * Skeleton — reusable shimmer loading placeholder.
 * Gunakan seperti div biasa, tambah className untuk ukuran dan bentuk.
 *
 * Contoh:
 *   <Skeleton className="h-8 w-32 rounded-lg" />
 *   <Skeleton className="h-4 w-full rounded" />
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-slate-100 rounded-lg",
        "before:absolute before:inset-0",
        "before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        "before:animate-[shimmer_1.5s_infinite]",
        className
      )}
      {...props}
    />
  )
}

/**
 * SkeletonCard — preset untuk kartu statistik
 */
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5 space-y-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

/**
 * SkeletonChart — preset untuk area chart
 */
export function SkeletonChart() {
  return (
    <div className="space-y-3 py-2">
      {/* Bar chart simulasi */}
      <div className="flex items-end gap-2 h-44 px-2">
        {[40, 65, 45, 80, 55, 70, 35, 90, 60, 75, 50, 85].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      {/* X axis labels */}
      <div className="flex gap-2 px-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-3" />
        ))}
      </div>
    </div>
  )
}

/**
 * SkeletonRow — preset untuk satu baris tabel
 */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${i === 0 ? "w-16" : i === cols - 1 ? "w-20" : "w-24"}`} />
        </td>
      ))}
    </tr>
  )
}
