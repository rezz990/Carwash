"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { TRANSACTION_BROADCAST } from "@/components/admin/NotificationCenter"
import type { NewTransactionEvent } from "@/hooks/useTransactionNotifications"

/** Menyatukan burst event transaksi menjadi satu refresh terbaru. */
export function useRealtimeRekap(
  refreshFn: () => void,
  options: { debounceMs?: number; enabled?: boolean } = {},
) {
  const { debounceMs = 2_000, enabled = true } = options
  const [lastTransaction, setLastTransaction] = useState<NewTransactionEvent | null>(null)
  const [pendingRefresh, setPendingRefresh] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const runRefresh = useEffectEvent(refreshFn)

  useEffect(() => {
    if (!enabled) return

    const handleNewTransaction = (event: Event) => {
      setLastTransaction((event as CustomEvent<NewTransactionEvent>).detail)
      setPendingRefresh(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        runRefresh()
        setPendingRefresh(false)
        timerRef.current = null
      }, debounceMs)
    }

    window.addEventListener(TRANSACTION_BROADCAST, handleNewTransaction)
    return () => {
      window.removeEventListener(TRANSACTION_BROADCAST, handleNewTransaction)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [debounceMs, enabled])

  return { lastTransaction, pendingRefresh }
}
