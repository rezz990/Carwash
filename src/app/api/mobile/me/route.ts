import { jsonError, jsonOk, requireMobileAuth } from "@/lib/mobile/http"
export async function GET(request: Request) { try { const auth = await requireMobileAuth(request, ["kasir"]); if ("error" in auth) return auth.error; return jsonOk({ user: auth.user }) } catch (error) { console.error(error); return jsonError(500, "INTERNAL_ERROR", "Terjadi kesalahan pada server") } }
