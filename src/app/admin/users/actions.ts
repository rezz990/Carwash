"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import type { PoolConnection } from "mysql2/promise"
import type { ResultSetHeader, RowDataPacket } from "mysql2"
import pool from "@/lib/db"
import { requireAdmin, type CurrentUser } from "@/lib/authz"
import { logActivity, type ActivityActor } from "@/lib/activityLog"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toActor(user: CurrentUser): ActivityActor {
  return { id: user.id, username: user.username, role: user.role }
}

function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 64) return "Username harus 3–64 karakter"
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Username hanya boleh berisi huruf, angka, dan underscore"
  return null
}

function validateName(name: string): string | null {
  return name.length > 255 ? "Nama lengkap maksimal 255 karakter" : null
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password minimal 8 karakter"
  if (password.length > 128) return "Password maksimal 128 karakter"
  return null
}

function mysqlCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : undefined
}

async function protectsLastAdmin(connection: PoolConnection, target: RowDataPacket): Promise<boolean> {
  if (target.role !== "admin" || !Boolean(target.aktif)) return false
  const [adminRows] = await connection.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE role = 'admin' AND aktif = 1 FOR UPDATE",
  )
  return adminRows.length <= 1
}

function refreshUsers() {
  revalidatePath("/admin/users")
  revalidatePath("/admin")
}

export async function createUser(params: { username: string; password: string; namaLengkap: string; role: "admin" | "kasir" }) {
  const { error: authError, user } = await requireAdmin()
  if (authError || !user) return { error: authError ?? "Anda harus login" }
  const username = params.username.trim()
  const namaLengkap = params.namaLengkap.trim().replace(/\s+/g, " ")
  const validationError = validateUsername(username) ?? validateName(namaLengkap) ?? validatePassword(params.password)
  if (validationError) return { error: validationError }
  if (params.role !== "admin" && params.role !== "kasir") return { error: "Role tidak valid" }

  const id = crypto.randomUUID()
  try {
    const passwordHash = await bcrypt.hash(params.password, 10)
    await pool.query(
      "INSERT INTO users (id, username, password_hash, nama_lengkap, role, aktif) VALUES (?, ?, ?, ?, ?, 1)",
      [id, username, passwordHash, namaLengkap || null, params.role],
    )
  } catch (error) {
    console.error("Create user error:", error)
    if (mysqlCode(error) === "ER_DUP_ENTRY") return { error: "Username sudah dipakai" }
    return { error: "Gagal membuat user baru" }
  }

  await logActivity({ actor: toActor(user), action: "CREATE", entityType: "user", entityId: id, description: `Menambahkan user "${username}" sebagai ${params.role}`, newValue: { username, nama_lengkap: namaLengkap || null, role: params.role } })
  refreshUsers()
  return { success: true }
}

export async function updateUser(params: { userId: string; username: string; namaLengkap: string; role: "admin" | "kasir" }) {
  const { error: authError, user } = await requireAdmin()
  if (authError || !user) return { error: authError ?? "Anda harus login" }
  if (!UUID_PATTERN.test(params.userId)) return { error: "ID user tidak valid" }
  const username = params.username.trim()
  const namaLengkap = params.namaLengkap.trim().replace(/\s+/g, " ")
  const validationError = validateUsername(username) ?? validateName(namaLengkap)
  if (validationError) return { error: validationError }
  if (params.role !== "admin" && params.role !== "kasir") return { error: "Role tidak valid" }
  if (params.userId === user.id && params.role !== "admin") return { error: "Role akun sendiri tidak bisa diturunkan" }

  const connection = await pool.getConnection()
  let target: RowDataPacket | undefined
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>("SELECT username, nama_lengkap, role, aktif FROM users WHERE id = ? LIMIT 1 FOR UPDATE", [params.userId])
    target = rows[0]
    if (!target) {
      await connection.rollback()
      return { error: "User tidak ditemukan" }
    }
    if (target.role === "admin" && params.role !== "admin" && await protectsLastAdmin(connection, target)) {
      await connection.rollback()
      return { error: "Admin aktif terakhir tidak dapat diubah menjadi kasir" }
    }
    const roleChanged = String(target.role) !== params.role
    const [result] = await connection.query<ResultSetHeader>(
      "UPDATE users SET username = ?, nama_lengkap = ?, role = ?, session_version = session_version + ? WHERE id = ?",
      [username, namaLengkap || null, params.role, roleChanged ? 1 : 0, params.userId],
    )
    if (result.affectedRows !== 1) throw new Error("Update user tidak mengubah satu baris")
    if (roleChanged) await connection.query("DELETE FROM mobile_sessions WHERE user_id = ?", [params.userId])
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    console.error("Update user error:", error)
    if (mysqlCode(error) === "ER_DUP_ENTRY") return { error: "Username sudah dipakai user lain" }
    return { error: "Gagal memperbarui akun" }
  } finally {
    connection.release()
  }

  await logActivity({ actor: toActor(user), action: "UPDATE", entityType: "user", entityId: params.userId, description: `Memperbarui akun "${target?.username}"`, oldValue: target ? { username: target.username, nama_lengkap: target.nama_lengkap, role: target.role } : undefined, newValue: { username, nama_lengkap: namaLengkap || null, role: params.role } })
  refreshUsers()
  return { success: true }
}

export async function resetPassword(userId: string, newPassword: string) {
  const { error: authError, user } = await requireAdmin()
  if (authError || !user) return { error: authError ?? "Anda harus login" }
  if (!UUID_PATTERN.test(userId)) return { error: "ID user tidak valid" }
  const passwordError = validatePassword(newPassword)
  if (passwordError) return { error: passwordError }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  const connection = await pool.getConnection()
  let username = ""
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>("SELECT username FROM users WHERE id = ? LIMIT 1 FOR UPDATE", [userId])
    if (!rows[0]) {
      await connection.rollback()
      return { error: "User tidak ditemukan" }
    }
    username = String(rows[0].username)
    const [result] = await connection.query<ResultSetHeader>("UPDATE users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?", [passwordHash, userId])
    if (result.affectedRows !== 1) throw new Error("Reset password tidak mengubah satu baris")
    await connection.query("DELETE FROM mobile_sessions WHERE user_id = ?", [userId])
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    console.error("Reset password error:", error)
    return { error: "Gagal mereset password" }
  } finally {
    connection.release()
  }

  await logActivity({ actor: toActor(user), action: "UPDATE", entityType: "user", entityId: userId, description: `Mereset password dan mencabut sesi aktif user "${username}"` })
  return { success: true }
}

export async function setUserActive(userId: string, aktif: boolean) {
  const { error: authError, user } = await requireAdmin()
  if (authError || !user) return { error: authError ?? "Anda harus login" }
  if (!UUID_PATTERN.test(userId) || typeof aktif !== "boolean") return { error: "Data status tidak valid" }
  if (user.id === userId && !aktif) return { error: "Akun sendiri tidak bisa dinonaktifkan" }

  const connection = await pool.getConnection()
  let target: RowDataPacket | undefined
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>("SELECT username, role, aktif FROM users WHERE id = ? LIMIT 1 FOR UPDATE", [userId])
    target = rows[0]
    if (!target) {
      await connection.rollback()
      return { error: "User tidak ditemukan" }
    }
    if (!aktif && await protectsLastAdmin(connection, target)) {
      await connection.rollback()
      return { error: "Admin aktif terakhir tidak dapat dinonaktifkan" }
    }
    const revokeSessions = !aktif && Boolean(target.aktif)
    const [result] = await connection.query<ResultSetHeader>(
      "UPDATE users SET aktif = ?, session_version = session_version + ? WHERE id = ?",
      [aktif, revokeSessions ? 1 : 0, userId],
    )
    if (result.affectedRows !== 1) throw new Error("Update status tidak mengubah satu baris")
    if (!aktif) await connection.query("DELETE FROM mobile_sessions WHERE user_id = ?", [userId])
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    console.error("Update status user error:", error)
    return { error: "Gagal mengubah status user" }
  } finally {
    connection.release()
  }

  await logActivity({ actor: toActor(user), action: "UPDATE", entityType: "user", entityId: userId, description: `${aktif ? "Mengaktifkan" : "Menonaktifkan"} user "${target?.username}"`, oldValue: { aktif: Boolean(target?.aktif) }, newValue: { aktif } })
  refreshUsers()
  return { success: true }
}

export async function deleteUser(userId: string) {
  const { error: authError, user } = await requireAdmin()
  if (authError || !user) return { error: authError ?? "Anda harus login" }
  if (!UUID_PATTERN.test(userId)) return { error: "ID user tidak valid" }
  if (user.id === userId) return { error: "Akun sendiri tidak bisa dihapus" }

  const connection = await pool.getConnection()
  let target: RowDataPacket | undefined
  try {
    await connection.beginTransaction()
    const [rows] = await connection.query<RowDataPacket[]>("SELECT username, nama_lengkap, role, aktif FROM users WHERE id = ? LIMIT 1 FOR UPDATE", [userId])
    target = rows[0]
    if (!target) {
      await connection.rollback()
      return { error: "User tidak ditemukan" }
    }
    if (await protectsLastAdmin(connection, target)) {
      await connection.rollback()
      return { error: "Admin aktif terakhir tidak dapat dihapus" }
    }
    const [countRows] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM transaksi WHERE kasir_id = ?", [userId])
    const count = Number(countRows[0]?.count ?? 0)
    if (count > 0) {
      await connection.rollback()
      return { error: `Akun memiliki ${count} riwayat transaksi. Nonaktifkan akun agar histori tetap utuh.` }
    }
    const [result] = await connection.query<ResultSetHeader>("DELETE FROM users WHERE id = ?", [userId])
    if (result.affectedRows !== 1) throw new Error("Delete user tidak menghapus satu baris")
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    console.error("Delete user error:", error)
    return { error: "Gagal menghapus user" }
  } finally {
    connection.release()
  }

  await logActivity({ actor: toActor(user), action: "DELETE", entityType: "user", entityId: userId, description: `Menghapus user "${target?.username}"`, oldValue: target ? { username: target.username, nama_lengkap: target.nama_lengkap, role: target.role } : undefined })
  refreshUsers()
  return { success: true }
}
