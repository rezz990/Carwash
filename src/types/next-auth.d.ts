import type { DefaultSession } from "next-auth"
declare module "next-auth" {
  interface User {
    role: "admin" | "kasir"
    idleTimeoutMinutes?: number
    sessionVersion?: number
  }
  interface Session {
    user?: DefaultSession["user"] & { id: string; role: "admin" | "kasir" }
    sessionId?: string
    lastActivity?: number
    idleTimeoutMinutes?: number
    sessionVersion?: number
    error?: "SessionExpired"
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "admin" | "kasir"
    sessionId?: string
    lastActivity?: number
    idleTimeoutMinutes?: number
    sessionVersion?: number
    error?: "SessionExpired"
  }
}
