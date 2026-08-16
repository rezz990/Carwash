import { requireAdmin } from "@/lib/authz";
import {
  eventBus,
  EVENT_NEW_TRANSACTION,
  type NewTransactionEvent,
} from "@/lib/events";

export const dynamic = "force-dynamic"; // jangan di-cache/static-optimize sama Next.js

const HEARTBEAT_INTERVAL_MS = 20_000; // 20 detik, cegah proxy/LiteSpeed timeout koneksi idle

export async function GET() {
  const { error } = await requireAdmin();
  if (error) {
    return new Response(JSON.stringify({ error }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let listener: ((data: NewTransactionEvent) => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Kirim event pembuka - browser EventSource butuh minimal 1 event
      // buat konfirmasi koneksi kebuka sukses
      controller.enqueue(encoder.encode(`: connected\n\n`));

      listener = (data: NewTransactionEvent) => {
        try {
          const payload = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // controller udah closed (client disconnect), abaikan
        }
      };

      eventBus.on(EVENT_NEW_TRANSACTION, listener);

      // Heartbeat comment line - bukan event beneran, cuma buat jaga
      // koneksi tetap "hidup" di mata reverse proxy (LiteSpeed dll)
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      // Client disconnect (tutup tab, pindah halaman, dll) - wajib cleanup
      // listener supaya ga numpuk jadi memory leak
      if (listener) eventBus.off(EVENT_NEW_TRANSACTION, listener);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // cegah reverse proxy nge-buffer stream
    },
  });
}