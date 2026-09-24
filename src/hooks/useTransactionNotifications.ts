"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { NewTransactionEvent } from "@/types/notifications";

export type { NewTransactionEvent };

/**
 * Subscribe ke SSE stream transaksi baru. Otomatis reconnect kalau koneksi
 * putus (browser EventSource sebenarnya udah auto-reconnect bawaan, tapi
 * kita tambah state biar UI bisa nunjukkin status koneksi kalau perlu).
 */
export function useTransactionNotifications(
  onNewTransaction: (data: NewTransactionEvent) => void
) {
  const [connected, setConnected] = useState(false);
  const handleTransaction = useEffectEvent(onNewTransaction);

  useEffect(() => {
    const eventSource = new EventSource("/api/admin/notifications/stream");

    eventSource.onopen = () => setConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const data: NewTransactionEvent = JSON.parse(event.data);
        handleTransaction(data);
      } catch (err) {
        console.error("Gagal parse notifikasi SSE:", err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      // Browser otomatis reconnect sendiri setelah error, tidak perlu
      // manual retry di sini.
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return { connected };
}
