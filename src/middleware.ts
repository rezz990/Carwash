import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const role = token?.role
    const pathname = req.nextUrl.pathname

    const lastActivity = Number(token?.lastActivity)
    const idleTimeoutMinutes = Number(token?.idleTimeoutMinutes)
    const idleTimeoutMs = idleTimeoutMinutes * 60_000
    const sessionIdle = !Number.isFinite(lastActivity)
      || !Number.isFinite(idleTimeoutMs)
      || idleTimeoutMs <= 0
      || Date.now() - lastActivity >= idleTimeoutMs

    if (sessionIdle) {
      const response = NextResponse.redirect(new URL("/login?reason=timeout", req.url))
      response.cookies.delete("next-auth.session-token")
      response.cookies.delete("__Secure-next-auth.session-token")
      return response
    }

    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    "/((?!login|api/auth|api/mobile|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
