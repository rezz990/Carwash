import { jsonError, jsonOk } from "@/lib/mobile/http"
import { rotateMobileSession } from "@/lib/mobile/session"

export async function POST(request: Request) {
  try {
    const body = await request.json(); const refreshToken = String(body?.refreshToken ?? "")
    if (!refreshToken) return jsonError(400, "INVALID_INPUT", "Refresh token wajib diisi")
    const session = await rotateMobileSession(refreshToken)
    if (!session) return jsonError(401, "INVALID_REFRESH_TOKEN", "Refresh token tidak valid atau sudah kedaluwarsa")
    return jsonOk({ tokenType: "Bearer", ...session })
  } catch (error) { console.error("Mobile refresh error:", error); return jsonError(500, "INTERNAL_ERROR", "Gagal memperbarui sesi") }
}
