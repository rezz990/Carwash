"use client"

import { useEffect, useRef } from "react"

/**
 * Hook untuk otomatis scroll ke form saat komponen mount.
 * Berguna untuk inline form yang muncul di bawah halaman (mobile).
 *
 * @param options - Konfigurasi scroll behavior
 * @returns ref yang harus dipasang ke elemen container form
 *
 * Contoh:
 *   const ref = useScrollToForm<HTMLDivElement>()
 *   return <div ref={ref}>...</div>
 */
export function useScrollToForm<T extends HTMLElement>(
  options: ScrollIntoViewOptions = { behavior: "smooth", block: "start" }
) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (ref.current) {
      // Delay sedikit supaya DOM sudah stabil
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView(options)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [options])

  return ref
}
