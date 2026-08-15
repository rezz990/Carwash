"use server"

import { revalidatePath } from "next/cache"
import pool from "@/lib/db"
import bcrypt from "bcryptjs"
import type { RowDataPacket } from "mysql2"
import { requireAdmin } from "@/lib/authz"

function validateUsername(username: string): string | null {
  if (!username || username.length < 3) {
    return "Username minimal 3 karakter"
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return "Username hanya boleh huruf, angka, dan underscore (tanpa spasi atau @)"
  }
  return null
}

export async function createUser(formData: FormData) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const username = (formData.get("username") as string || "").trim()
  const password = formData.get("password") as string
  const namaLengkap = (formData.get("nama_lengkap") as string || "").trim()
  const role = formData.get("role") as string

  const usernameError = validateUsername(username)
  if (usernameError) return { error: usernameError }

  if (!password || password.length < 6) {
    return { error: "Password minimal 6 karakter" }
  }

  if (role !== "kasir" && role !== "admin") {
    return { error: "Role tidak valid" }
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    
    // Instead of using UUID in DB natively (which might fail if UUID() is not standard in old MySQL), we use JS uuid
    const newId = crypto.randomUUID()
    
    await pool.query(
      "INSERT INTO users (id, username, password_hash, nama_lengkap, role, aktif) VALUES (?, ?, ?, ?, ?, ?)",
      [newId, username, passwordHash, namaLengkap || null, role, true]
    )
  } catch (error: any) {
    console.error("Create user error:", error)
    if (error.code === 'ER_DUP_ENTRY') {
      return { error: "Username sudah dipakai" }
    }
    return { error: "Gagal membuat user baru" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function resetPassword(userId: string, newPassword: string) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  if (!newPassword || newPassword.length < 6) {
    return { error: "Password minimal 6 karakter" }
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10)
    await pool.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, userId]
    )
  } catch (error) {
    console.error("Reset password error:", error)
    return { error: "Gagal reset password" }
  }

  return { success: true }
}

export async function updateUserRole(userId: string, newRole: string) {
  const { error: authError, user: currentUser } = await requireAdmin()
  if (authError) return { error: authError }

  if (newRole !== "kasir" && newRole !== "admin") {
    return { error: "Role tidak valid" }
  }

  if ((currentUser as any).id === userId && newRole !== "admin") {
    return { error: "Tidak bisa mengubah role akun sendiri" }
  }

  try {
    await pool.query(
      "UPDATE users SET role = ? WHERE id = ?",
      [newRole, userId]
    )
  } catch (error) {
    console.error("Update role error:", error)
    return { error: "Gagal mengubah role" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function toggleAktifUser(userId: string, aktif: boolean) {
  const { error: authError, user: currentUser } = await requireAdmin()
  if (authError) return { error: authError }

  if ((currentUser as any).id === userId && !aktif) {
    return { error: "Tidak bisa menonaktifkan akun sendiri" }
  }

  try {
    await pool.query(
      "UPDATE users SET aktif = ? WHERE id = ?",
      [aktif, userId]
    )
  } catch (error) {
    console.error("Toggle aktif user error:", error)
    return { error: "Gagal mengubah status user" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function updateUserProfile(params: {
  userId: string
  newUsername: string
  newNamaLengkap: string
}) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const username = params.newUsername.trim()
  const namaLengkap = params.newNamaLengkap.trim()

  const usernameError = validateUsername(username)
  if (usernameError) return { error: usernameError }

  try {
    await pool.query(
      "UPDATE users SET username = ?, nama_lengkap = ? WHERE id = ?",
      [username, namaLengkap || null, params.userId]
    )
  } catch (error: any) {
    console.error("Update profile error:", error)
    if (error.code === 'ER_DUP_ENTRY') {
      return { error: "Username sudah dipakai user lain" }
    }
    return { error: "Gagal mengubah profile" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function deleteUser(userId: string) {
  const { error: authError, user: currentUser } = await requireAdmin()
  if (authError) return { error: authError }

  if ((currentUser as any).id === userId) {
    return { error: "Tidak bisa menghapus akun sendiri" }
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(id) as count FROM transaksi WHERE kasir_id = ?",
      [userId]
    )

    const count = rows[0].count
    if (count > 0) {
      return {
        error: `User ini punya ${count} riwayat transaksi dan tidak bisa dihapus permanen (data transaksi akan kehilangan referensi). Gunakan "Nonaktifkan" saja untuk mencegah user ini login, tanpa menghapus riwayatnya.`,
      }
    }

    await pool.query("DELETE FROM users WHERE id = ?", [userId])
  } catch (error) {
    console.error("Delete user error:", error)
    return { error: "Gagal menghapus user" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}