"use client"

import { useEffect, useState, useCallback } from "react"
import { TRANSACTION_BROADCAST } from "@/components/admin/NotificationCenter"
import type { NewTransactionEvent } from "@/hooks/useTransactionNotifications"

/**
 * Hook untuk auto-refresh data halaman rekap saat ada transaksi baru.
 * Mendengarkan broadcast event dari NotificationCenter (SSE).
 *
 * @param refreshFn - Fungsi untuk refresh data (misal: router.refresh() atau fetch ulang)
 * @param options - Konfigurasi debounce dan enable/disable
 */
export function useRealtimeRekap(
  refreshFn: () => void,
  options: { debounceMs?: number; enabled?: boolean } = {}
) {
  const { debounceMs = 2000, enabled = true } = options
  const [lastTransaction, setLastTransaction] = useState<NewTransactionEvent | null>(null)
  const [pendingRefresh, setPendingRefresh] = useState(false)

  const debouncedRefresh = useCallback(() => {
    setPendingRefresh(true)
    const timer = setTimeout(() => {
      refreshFn()
      setPendingRefresh(false)
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [refreshFn, debounceMs])

  useEffect(() => {
    if (!enabled) return

    const handleNewTransaction = (e: Event) => {
      const customEvent = e as CustomEvent<NewTransactionEvent>
      setLastTransaction(customEvent.detail)
      debouncedRefresh()
    }

    window.addEventListener(TRANSACTION_BROADCAST, handleNewTransaction)
    return () => window.removeEventListener(TRANSACTION_BROADCAST, handleNewTransaction)
  }, [enabled, debouncedRefresh])

  return { lastTransaction, pendingRefresh }
}
