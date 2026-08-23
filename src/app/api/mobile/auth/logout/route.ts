import { jsonError, jsonOk, getClientIp } from "@/lib/mobile/http"
import { revokeMobileSession } from "@/lib/mobile/session"
import { logActivity } from "@/lib/activityLog"

export async function POST(request: Request) {
  try {
    const body = await request.json(); const refreshToken = String(body?.refreshToken ?? "")
    if (refreshToken) {
      const revoked = await revokeMobileSession(refreshToken)
      if (revoked) {
        await logActivity({
          actor: { id: revoked.userId, username: revoked.username, role: revoked.role },
          action: "LOGOUT",
          entityType: "auth",
          entityId: revoked.userId,
          description: `Logout dari Android Kasir sebagai "${revoked.username}"`,
          ip: getClientIp(request),
          userAgent: request.headers.get("user-agent"),
        })
      }
    }
    return jsonOk({ message: "Logout berhasil" })
  }
  catch (error) { console.error("Mobile logout error:", error); return jsonError(500, "INTERNAL_ERROR", "Gagal logout") }
}
