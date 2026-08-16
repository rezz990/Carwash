"use client";

import { useCallback, useRef, useState } from "react";
import {
  useTransactionNotifications,
  type NewTransactionEvent,
} from "@/hooks/useTransactionNotifications";

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
 * Mainkan bunyi "beep" notifikasi pendek pakai Web Audio API - tidak butuh
 * file audio eksternal sama sekali, jadi tidak ada asset yang perlu di-upload.
 */
function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();

    // Nada dua-beep pendek (naik dikit di beep kedua) - kesan "ding-ding"
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
    playBeep(now, 880); // A5
    playBeep(now + 0.15, 1108.73); // C#6

    // Tutup AudioContext setelah selesai, biar tidak numpuk instance
    setTimeout(() => ctx.close(), 500);
  } catch (err) {
    console.error("Gagal memainkan suara notifikasi:", err);
  }
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300 bg-indigo-50/95 border-indigo-200 text-indigo-800 max-w-sm">
      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      </div>
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
      </button>
    </div>
  );
}

/**
 * Dipasang SEKALI di admin layout (bukan per-halaman) supaya notifikasi
 * muncul di halaman admin manapun yang lagi dibuka, bukan cuma Overview.
 */
export function NotificationCenter() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleNewTransaction = useCallback((data: NewTransactionEvent) => {
    playNotificationSound();

    const kasirLabel = data.kasir.namaLengkap || data.kasir.username;
    const platLabel =
      data.platNomor && data.platNomor !== "B0000XX" ? ` (${data.platNomor})` : "";
    const message = `Transaksi baru: ${data.jenisKendaraan.kategori} ${data.jenisKendaraan.ukuran}${platLabel} - ${formatRupiah(data.tarif)} oleh ${kasirLabel}`;

    const id = `${data.id}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message }]);

    // Auto-dismiss setelah 6 detik
    setTimeout(() => removeToast(id), 6000);
  }, [removeToast]);

  useTransactionNotifications(handleNewTransaction);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}