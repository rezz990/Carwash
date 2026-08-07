"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"

// Helper: pastikan yang manggil action ini beneran admin.
// RLS di database juga sudah menjaga ini di level tabel, tapi untuk
// operasi lewat service_role (yang bypass RLS), verifikasi manual di sini wajib.
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Anda harus login" as const, user: null }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return { error: "Hanya admin yang bisa mengakses fitur ini" as const, user: null }
  }

  return { error: null, user }
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

  const email = `${username}@carwash.internal`
  const adminClient = createAdminClient()

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !createdUser.user) {
    console.error("Create user error:", createError)
    if (createError?.message?.includes("already registered")) {
      return { error: "Username sudah dipakai" }
    }
    return { error: "Gagal membuat user baru" }
  }

  // Trigger handle_new_user() otomatis bikin row di profiles dengan role
  // default 'kasir'. Kalau role yang diminta 'admin' atau ada nama lengkap,
  // update di sini.
  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ role, nama_lengkap: namaLengkap || null })
    .eq("id", createdUser.user.id)

  if (updateError) {
    console.error("Update profile after create error:", updateError)
    return { error: "User dibuat tapi gagal set role/nama. Cek manual di kelola user." }
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

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) {
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

  // Cegah admin nonaktifkan/downgrade akun dirinya sendiri (biar tidak
  // ke-lock out dari sistem tanpa admin lain)
  if (currentUser?.id === userId && newRole !== "admin") {
    return { error: "Tidak bisa mengubah role akun sendiri" }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId)

  if (error) {
    console.error("Update role error:", error)
    return { error: "Gagal mengubah role" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function toggleAktifUser(userId: string, aktif: boolean) {
  const { error: authError, user: currentUser } = await requireAdmin()
  if (authError) return { error: authError }

  if (currentUser?.id === userId && !aktif) {
    return { error: "Tidak bisa menonaktifkan akun sendiri" }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ aktif })
    .eq("id", userId)

  if (error) {
    console.error("Toggle aktif user error:", error)
    return { error: "Gagal mengubah status user" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}