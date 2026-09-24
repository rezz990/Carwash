export function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: "indigo" | "emerald" | "slate" }) {
  const colorMap = {
    indigo: "text-yellow-600",
    emerald: "text-emerald-600",
    slate: "text-slate-900",
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-3.5 sm:p-5 min-w-0">
      <p className="text-xs sm:text-sm text-slate-500 font-medium leading-snug">{label}</p>
      <p className={`text-lg sm:text-2xl font-bold mt-1.5 tabular-nums break-words ${colorMap[accent || "slate"]}`}>{value}</p>
    </div>
  )
}
