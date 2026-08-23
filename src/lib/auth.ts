import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { logActivity } from "@/lib/activityLog";

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
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const [rows] = await pool.query<RowDataPacket[]>(
          "SELECT id, username, password_hash, role, aktif FROM users WHERE username = ?",
          [credentials.username]
        );

        if (rows.length === 0) {
          await logActivity({
            actor: null,
            action: "LOGIN",
            entityType: "auth",
            description: `Percobaan login gagal, username "${credentials.username}" tidak ditemukan`,
          });
          return null;
        }

        const user = rows[0];

        if (!user.aktif) {
          await logActivity({
            actor: { id: user.id, username: user.username, role: user.role },
            action: "LOGIN",
            entityType: "auth",
            entityId: user.id,
            description: `Percobaan login ditolak, akun "${user.username}" dinonaktifkan`,
          });
          throw new Error("Akun dinonaktifkan");
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);

        if (!isValidPassword) {
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

        return {
          id: user.id,
          name: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      const id = (token as any)?.id as string | undefined;
      const username = (token as any)?.name as string | undefined;
      const role = (token as any)?.role as string | undefined;
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
