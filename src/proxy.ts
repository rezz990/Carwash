import { getToken } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"
import { isSessionExpired } from "@/lib/sessionPolicy"

export async function proxy(req: NextRequest) {
  const token = await getToken({ req })
  if (isSessionExpired(token) || !token?.id || token.role !== "admin") {
    const response = req.nextUrl.pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Sesi berakhir. Silakan masuk kembali." }, { status: 401 })
      : NextResponse.redirect(new URL(token ? "/login?reason=timeout" : "/login", req.url))
    for (const cookie of req.cookies.getAll()) {
      if (/^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/.test(cookie.name)) response.cookies.delete(cookie.name)
    }
    return response
  }
  return NextResponse.next()
}
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] }
