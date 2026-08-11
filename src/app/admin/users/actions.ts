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

  const adminClient = createAdminClient()
  const newEmail = `${username}@carwash.internal`

  // Update email di Supabase Auth JUGA (bukan cuma kolom username di profiles),
  // karena login pakai konversi username -> email. Kalau cuma update profiles
  // tanpa update auth.users, username baru ga akan bisa dipakai login.
  const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(params.userId, {
    email: newEmail,
  })

  if (authUpdateError) {
    console.error("Update auth email error:", authUpdateError)
    if (authUpdateError.message?.includes("already registered") || authUpdateError.message?.includes("already exists")) {
      return { error: "Username sudah dipakai user lain" }
    }
    return { error: "Gagal mengubah username" }
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ username, nama_lengkap: namaLengkap || null })
    .eq("id", params.userId)

  if (profileError) {
    console.error("Update profile error:", profileError)
    return { error: "Username di auth berhasil diubah, tapi gagal update profil. Cek manual." }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

export async function deleteUser(userId: string) {
  const { error: authError, user: currentUser } = await requireAdmin()
  if (authError) return { error: authError }

  if (currentUser?.id === userId) {
    return { error: "Tidak bisa menghapus akun sendiri" }
  }

  const supabase = await createClient()

  // Cek dulu apakah user ini pernah input transaksi. Kalau iya, JANGAN
  // dihapus - transaksi lama akan kehilangan referensi kasir_id-nya.
  // Database sebenarnya juga akan menolak (foreign key constraint), tapi
  // dicek manual dulu di sini supaya pesan errornya jelas buat admin.
  const { count, error: countError } = await supabase
    .from("transaksi")
    .select("id", { count: "exact", head: true })
    .eq("kasir_id", userId)

  if (countError) {
    console.error("Check transaksi count error:", countError)
    return { error: "Gagal mengecek riwayat transaksi user ini" }
  }

  if (count && count > 0) {
    return {
      error: `User ini punya ${count} riwayat transaksi dan tidak bisa dihapus permanen (data transaksi akan kehilangan referensi). Gunakan "Nonaktifkan" saja untuk mencegah user ini login, tanpa menghapus riwayatnya.`,
    }
  }

  const adminClient = createAdminClient()
  // Hapus dari auth.users - kolom profiles.id punya "on delete cascade"
  // ke auth.users(id), jadi row profiles ikut terhapus otomatis.
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

  if (deleteError) {
    console.error("Delete user error:", deleteError)
    return { error: "Gagal menghapus user" }
  }

  revalidatePath("/admin/users")
  return { success: true }
}