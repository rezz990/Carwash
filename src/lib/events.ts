import { EventEmitter } from "node:events";
import type { NewTransactionEvent } from "@/types/notifications";

export type { NewTransactionEvent } from "@/types/notifications";

/**
 * Singleton event emitter untuk broadcast transaksi baru ke semua koneksi
 * SSE admin yang lagi aktif. Ini cuma jalan bener di server Node.js yang
 * PERSISTEN (cPanel Node.js App / VPS) - TIDAK akan jalan di platform
 * serverless (Vercel) karena tiap request bisa dapet instance proses baru,
 * jadi in-memory emitter ini ga akan konsisten antar request.
 *
 * Instance ini nempel ke `globalThis` supaya tidak ke-reset kalau Next.js
 * melakukan module hot-reload di dev mode.
 */

declare global {
  var __carwashEventBus: EventEmitter | undefined;
}

export const eventBus: EventEmitter =
  globalThis.__carwashEventBus ??
  (globalThis.__carwashEventBus = new EventEmitter());

// Default max listeners Node.js cuma 10 - naikkan karena tiap tab admin
// yang buka dashboard bakal nambah 1 listener aktif.
eventBus.setMaxListeners(50);

export const EVENT_NEW_TRANSACTION = "new-transaction";

export function emitNewTransaction(data: NewTransactionEvent) {
  eventBus.emit(EVENT_NEW_TRANSACTION, data);
}
