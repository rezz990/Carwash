"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useTransactionNotifications,
  type NewTransactionEvent,
} from "@/hooks/useTransactionNotifications";
import { useBrowserNotification } from "@/hooks/useBrowserNotification";
import { motion, AnimatePresence } from "framer-motion";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type ToastItem = {
  id: string;
  message: string;
};

/**
 * Mainkan bunyi "beep" notifikasi pendek pakai Web Audio API.
 */
function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();

    const playBeep = (startTime: number, frequency: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    };

    const now = ctx.currentTime;
    playBeep(now, 880);
    playBeep(now + 0.15, 1108.73);

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Abaikan
  }
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.12)] border backdrop-blur-md bg-indigo-50/95 border-indigo-200 text-indigo-800 max-w-sm"
    >
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
      </div>
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
      </button>
    </motion.div>
  );
}

/**
 * Global event untuk broadcast transaksi baru ke komponen lain
 * (misal: halaman rekap yang perlu auto-refresh).
 */
export const TRANSACTION_BROADCAST = "carwash:new-transaction-broadcast";

export function broadcastNewTransaction(data: NewTransactionEvent) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(TRANSACTION_BROADCAST, { detail: data })
    );
  }
}

/**
 * Dipasang SEKALI di admin layout.
 * Menangani:
 * - Toast in-app
 * - Suara notifikasi
 * - Browser Notification API (desktop/mobile native)
 * - Broadcast event ke halaman lain
 */
export function NotificationCenter() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { enabled: browserNotifEnabled, notify } = useBrowserNotification();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleNewTransaction = useCallback(
    (data: NewTransactionEvent) => {
      playNotificationSound();

      const kasirLabel = data.kasir.namaLengkap || data.kasir.username;
      const platLabel =
        data.platNomor && data.platNomor !== "B0000XX"
          ? ` (${data.platNomor})`
          : "";
      const message = `Transaksi baru: ${data.jenisKendaraan.kategori} ${data.jenisKendaraan.ukuran}${platLabel} — ${formatRupiah(data.tarif)} oleh ${kasirLabel}`;

      // Toast in-app
      const id = `${data.id}-${Date.now()}`;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => removeToast(id), 6000);

      // Browser native notification
      if (browserNotifEnabled) {
        notify("Transaksi Baru — POS Carwash", {
          body: `${data.jenisKendaraan.kategori} ${data.jenisKendaraan.ukuran}${platLabel}\n${formatRupiah(data.tarif)} — ${kasirLabel}`,
          icon: "/favicon.ico",
          tag: `tx-${data.id}`,
          requireInteraction: false,
        });
      }

      // Badge counter (untuk tab browser & internal UI)
      setUnreadCount((prev) => prev + 1);

      // Broadcast ke halaman lain (rekap, dashboard, dll)
      broadcastNewTransaction(data);
    },
    [browserNotifEnabled, notify, removeToast]
  );

  useTransactionNotifications(handleNewTransaction);

  // Reset badge saat user klik di mana saja
  useEffect(() => {
    const reset = () => setUnreadCount(0);
    window.addEventListener("click", reset);
    return () => window.removeEventListener("click", reset);
  }, []);

  // Update favicon badge / title saat ada transaksi baru
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Carwash Management`;
    } else {
      document.title = "Carwash Management";
    }
  }, [unreadCount]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="pointer-events-auto"
          >
            <Toast
              message={toast.message}
              onClose={() => removeToast(toast.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Badge kecil yang menunjukkan jumlah transaksi baru.
 * Bisa dipasang di sidebar nav atau header.
 */
export function NewTransactionBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
    >
      {count > 99 ? "99+" : count}
    </motion.span>
  );
}
