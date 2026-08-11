"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Anda harus login" as const, user: null }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return { error: "Hanya admin yang bisa mengakses fitur ini" as const, user: null }
  }

  return { error: null, user, username: profile.username }
}

// ---------------------------------------------------------
// AKUN SAYA
// ---------------------------------------------------------

export async function updateOwnProfile(namaLengkap: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Anda harus login" }

  const { error } = await supabase
    .from("profiles")
    .update({ nama_lengkap: namaLengkap.trim() || null })
    .eq("id", user.id)

  if (error) {
    console.error("Update own profile error:", error)
    return { error: "Gagal menyimpan nama" }
  }

  revalidatePath("/admin/pengaturan")
  return { success: true }
}

export async function changeOwnPassword(params: {
  currentPassword: string
  newPassword: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { error: "Anda harus login" }

  if (params.newPassword.length < 6) {
    return { error: "Password baru minimal 6 karakter" }
  }

  // Verifikasi password lama dulu dengan cara sign-in ulang. Kalau salah,
  // signInWithPassword bakal error dan kita tolak proses ganti password.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: params.currentPassword,
  })

  if (verifyError) {
    return { error: "Password lama salah" }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: params.newPassword,
  })

  if (updateError) {
    console.error("Change password error:", updateError)
    return { error: "Gagal mengubah password" }
  }

  return { success: true }
}

// ---------------------------------------------------------
// ZONA BAHAYA: Backup, Restore, Reset
// ---------------------------------------------------------

export type BackupRow = {
  tanggal_waktu: string
  jenis_kendaraan_id: string
  plat_nomor: string | null
  tarif_total: number
  tarif_jatah_karyawan: number
  tarif_jatah_pemilik: number
  kasir_id: string
}

export async function fetchAllTransaksiForBackup(): Promise<{ data: BackupRow[]; error?: string }> {
  const { error: authError } = await requireAdmin()
  if (authError) return { data: [], error: authError }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transaksi")
    .select("tanggal_waktu, jenis_kendaraan_id, plat_nomor, tarif_total, tarif_jatah_karyawan, tarif_jatah_pemilik, kasir_id")
    .order("tanggal_waktu", { ascending: true })

  if (error) {
    console.error("Fetch backup error:", error)
    return { data: [], error: "Gagal mengambil data untuk backup" }
  }

  return { data: data as BackupRow[] }
}

export async function restoreTransaksiBackup(params: {
  rows: BackupRow[]
  mode: "append" | "replace"
}) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  if (!Array.isArray(params.rows) || params.rows.length === 0) {
    return { error: "File backup kosong atau tidak valid" }
  }

  // Validasi struktur dasar tiap baris sebelum insert
  for (const row of params.rows) {
    if (
      !row.tanggal_waktu ||
      !row.jenis_kendaraan_id ||
      typeof row.tarif_total !== "number" ||
      typeof row.tarif_jatah_karyawan !== "number" ||
      typeof row.tarif_jatah_pemilik !== "number" ||
      !row.kasir_id
    ) {
      return { error: "Format file backup tidak sesuai. Pastikan file belum diubah manual." }
    }
  }

  const adminClient = createAdminClient()

  if (params.mode === "replace") {
    const { error: deleteError } = await adminClient.from("transaksi").delete().neq("id", "00000000-0000-0000-0000-000000000000")
    if (deleteError) {
      console.error("Delete before restore error:", deleteError)
      return { error: "Gagal menghapus data lama sebelum restore" }
    }
  }

  // Insert bertahap per 500 baris, biar ga kena limit payload sekali insert
  const CHUNK_SIZE = 500
  for (let i = 0; i < params.rows.length; i += CHUNK_SIZE) {
    const chunk = params.rows.slice(i, i + CHUNK_SIZE)
    const { error: insertError } = await adminClient.from("transaksi").insert(chunk)
    if (insertError) {
      console.error("Restore insert error:", insertError)
      return {
        error: `Gagal restore di baris ke-${i}. Kemungkinan ada jenis_kendaraan_id atau kasir_id yang sudah tidak ada di database. ${params.mode === "replace" ? "PERHATIAN: data lama sudah terlanjur terhapus." : ""}`,
      }
    }
  }

  revalidatePath("/admin", "layout")
  return { success: true, jumlahRestored: params.rows.length }
}

export async function resetTransaksiData() {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from("transaksi").delete().neq("id", "00000000-0000-0000-0000-000000000000")

  if (error) {
    console.error("Reset data error:", error)
    return { error: "Gagal menghapus data transaksi" }
  }

  revalidatePath("/admin", "layout")
  return { success: true }
}