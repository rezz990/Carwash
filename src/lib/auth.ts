import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { logActivity } from "@/lib/activityLog";
import { getLoginTimeoutMinutes } from "@/lib/loginTimeout";
import { isSessionExpired } from "@/lib/sessionPolicy";
import { randomUUID } from "node:crypto";
import { checkLoginAttempt, clearLoginFailures, loginAttemptKey, recordLoginFailure } from "@/lib/loginRateLimit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!username || username.length > 64 || !password || password.length > 1024) {
          return null;
        }

        const forwarded = request.headers?.["x-forwarded-for"];
        const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        const clientIp = forwardedValue?.split(",")[0]?.trim() || String(request.headers?.["x-real-ip"] ?? "unknown");
        const attemptKey = loginAttemptKey(clientIp, username);
        if (!checkLoginAttempt(attemptKey).allowed) return null;

        const [rows] = await pool.query<RowDataPacket[]>(
          "SELECT id, username, password_hash, role, aktif, session_version FROM users WHERE username = ? LIMIT 1",
          [username]
        );

        if (rows.length === 0) {
          recordLoginFailure(attemptKey);
          await logActivity({
            actor: null,
            action: "LOGIN",
            entityType: "auth",
            description: `Percobaan login gagal, username "${username}" tidak ditemukan`,
          });
          return null;
        }

        const user = rows[0];

        if (!user.aktif) {
          recordLoginFailure(attemptKey);
          await logActivity({
            actor: { id: user.id, username: user.username, role: user.role },
            action: "LOGIN",
            entityType: "auth",
            entityId: user.id,
            description: `Percobaan login ditolak, akun "${user.username}" dinonaktifkan`,
          });
          throw new Error("Akun dinonaktifkan");
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
          recordLoginFailure(attemptKey);
          await logActivity({
            actor: { id: user.id, username: user.username, role: user.role },
            action: "LOGIN",
            entityType: "auth",
            entityId: user.id,
            description: `Percobaan login gagal untuk "${user.username}", password salah`,
          });
          return null;
        }

        await logActivity({
          actor: { id: user.id, username: user.username, role: user.role },
          action: "LOGIN",
          entityType: "auth",
          entityId: user.id,
          description: `Login berhasil sebagai "${user.username}"`,
        });

        clearLoginFailures(attemptKey);

        const idleTimeoutMinutes = await getLoginTimeoutMinutes();

        return {
          id: user.id,
          name: user.username,
          role: user.role,
          sessionVersion: Number(user.session_version),
          idleTimeoutMinutes,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
        token.sessionId = randomUUID();
        token.error = undefined;
        token.lastActivity = Date.now();
        token.idleTimeoutMinutes = user.idleTimeoutMinutes ?? 60;
      } else if (isSessionExpired(token)) {
        // NextAuth v4 expects a JWT object. Remove access claims permanently.
        return { ...token, id: undefined, role: undefined, error: "SessionExpired" };
      } else if (trigger === "update") {
        // Waktu aktivitas selalu dibuat server. Jangan mempercayai timestamp
        // dari browser karena nilai tersebut dapat dimanipulasi.
        token.lastActivity = Date.now();
        token.idleTimeoutMinutes = await getLoginTimeoutMinutes();
      }
      token.sessionId ??= randomUUID();
      return token;
    },
    async session({ session, token }) {
      if (isSessionExpired(token) || !token.id || !token.role) {
        return { expires: session.expires, error: "SessionExpired" };
      }
      session.user = { ...session.user, id: token.id, role: token.role };
      session.sessionId = token.sessionId;
      session.lastActivity = token.lastActivity;
      session.idleTimeoutMinutes = token.idleTimeoutMinutes;
      session.sessionVersion = token.sessionVersion;
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      const id = token?.id;
      const username = token?.name;
      const role = token?.role;
      if (!id) return;
      await logActivity({
        actor: { id, username, role: role as "admin" | "kasir" | undefined },
        action: "LOGOUT",
        entityType: "auth",
        entityId: id,
        description: `Logout dari akun "${username ?? id}"`,
      });
    },
  },
};
