"use client"
import { useId } from "react"
import { Input } from "./Input"
export function DateRangeFields({ from, to, onFromChange, onToChange }: { from: string; to: string; onFromChange: (value: string) => void; onToChange: (value: string) => void }) {
  const id = useId()
  return <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
    <div className="min-w-0"><label htmlFor={`${id}-from`} className="field-label">Dari tanggal</label><Input id={`${id}-from`} type="date" required value={from} max={to || undefined} onChange={e => onFromChange(e.target.value)} /></div>
    <div className="min-w-0"><label htmlFor={`${id}-to`} className="field-label">Sampai tanggal</label><Input id={`${id}-to`} type="date" required value={to} min={from || undefined} onChange={e => onToChange(e.target.value)} /></div>
  </div>
}
