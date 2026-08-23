"use server"

import { revalidatePath } from "next/cache"
import pool from "@/lib/db"
import bcrypt from "bcryptjs"
import type { RowDataPacket } from "mysql2"
import { requireAdmin } from "@/lib/authz"
import { logActivity, type ActivityActor } from "@/lib/activityLog"

function toActor(user: { id: string; username: string; role: string } | null): ActivityActor {
  if (!user) return null
  return { id: user.id, username: user.username, role: user.role as "admin" | "kasir" }
}

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
  const { error: authError, user: currentUser } = await requireAdmin()
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

  const newId = crypto.randomUUID()

  try {
    const passwordHash = await bcrypt.hash(password, 10)

    // Instead of using UUID in DB natively (which might fail if UUID() is not standard in old MySQL), we use JS uuid
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

  await logActivity({
    actor: toActor(currentUser as any),
    action: "CREATE",
    entityType: "user",
    entityId: newId,
    description: `Menambahkan user baru "${username}" dengan role ${role}`,
    newValue: { username, nama_lengkap: namaLengkap || null, role },
  })

  revalidatePath("/admin/users")
  return { success: true }
}

export async function resetPassword(userId: string, newPassword: string) {
  const { error: authError, user: currentUser } = await requireAdmin()
  if (authError) return { error: authError }

  if (!newPassword || newPassword.length < 6) {
    return { error: "Password minimal 6 karakter" }
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT username FROM users WHERE id = ? LIMIT 1",
      [userId]
    )
    const targetUsername = rows[0]?.username ?? null

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await pool.query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, userId]
    )

    await logActivity({
      actor: toActor(currentUser as any),
      action: "UPDATE",
      entityType: "user",
      entityId: userId,
      description: `Reset password untuk user "${targetUsername ?? userId}"`,
    })
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
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT username, role FROM users WHERE id = ? LIMIT 1",
      [userId]
    )
    const target = rows[0]

    await pool.query(
      "UPDATE users SET role = ? WHERE id = ?",
      [newRole, userId]
    )

    await logActivity({
      actor: toActor(currentUser as any),
      action: "UPDATE",
      entityType: "user",
      entityId: userId,
      description: `Mengubah role user "${target?.username ?? userId}" dari ${target?.role ?? "?"} menjadi ${newRole}`,
      oldValue: target ? { role: target.role } : undefined,
      newValue: { role: newRole },
    })
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
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT username, aktif FROM users WHERE id = ? LIMIT 1",
      [userId]
    )
    const target = rows[0]

    await pool.query(
      "UPDATE users SET aktif = ? WHERE id = ?",
      [aktif, userId]
    )

    await logActivity({
      actor: toActor(currentUser as any),
      action: "UPDATE",
      entityType: "user",
      entityId: userId,
      description: `${aktif ? "Mengaktifkan" : "Menonaktifkan"} user "${target?.username ?? userId}"`,
      oldValue: target ? { aktif: Boolean(target.aktif) } : undefined,
      newValue: { aktif },
    })
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
  const { error: authError, user: currentUser } = await requireAdmin()
  if (authError) return { error: authError }

  const username = params.newUsername.trim()
  const namaLengkap = params.newNamaLengkap.trim()

  const usernameError = validateUsername(username)
  if (usernameError) return { error: usernameError }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT username, nama_lengkap FROM users WHERE id = ? LIMIT 1",
      [params.userId]
    )
    const target = rows[0]

    await pool.query(
      "UPDATE users SET username = ?, nama_lengkap = ? WHERE id = ?",
      [username, namaLengkap || null, params.userId]
    )

    await logActivity({
      actor: toActor(currentUser as any),
      action: "UPDATE",
      entityType: "user",
      entityId: params.userId,
      description: `Mengubah profil user "${target?.username ?? params.userId}"`,
      oldValue: target ? { username: target.username, nama_lengkap: target.nama_lengkap } : undefined,
      newValue: { username, nama_lengkap: namaLengkap || null },
    })
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
    const [countRows] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(id) as count FROM transaksi WHERE kasir_id = ?",
      [userId]
    )

    const count = countRows[0].count
    if (count > 0) {
      return {
        error: `User ini punya ${count} riwayat transaksi dan tidak bisa dihapus permanen (data transaksi akan kehilangan referensi). Gunakan "Nonaktifkan" saja untuk mencegah user ini login, tanpa menghapus riwayatnya.`,
      }
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT username, nama_lengkap, role FROM users WHERE id = ? LIMIT 1",
      [userId]
    )
    const target = rows[0]

    await pool.query("DELETE FROM users WHERE id = ?", [userId])

    await logActivity({
      actor: toActor(currentUser as any),
      action: "DELETE",
      entityType: "user",
      entityId: userId,
      description: `Menghapus user "${target?.username ?? userId}"`,
      oldValue: target ? { username: target.username, nama_lengkap: target.nama_lengkap, role: target.role } : undefined,
    })
  } catch (error) {
    console.error("Delete user error:", error)
    return { error: "Gagal menghapus user" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}
