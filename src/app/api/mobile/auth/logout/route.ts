import { jsonError, jsonOk } from "@/lib/mobile/http"
import { revokeMobileSession } from "@/lib/mobile/session"

export async function POST(request: Request) {
  try { const body = await request.json(); const refreshToken = String(body?.refreshToken ?? ""); if (refreshToken) await revokeMobileSession(refreshToken); return jsonOk({ message: "Logout berhasil" }) }
  catch (error) { console.error("Mobile logout error:", error); return jsonError(500, "INTERNAL_ERROR", "Gagal logout") }
}
