"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function updateTarifDefault(id: string, tarifDefault: number, jatahKaryawan: number) {
  const supabase = await createClient()

  // Validasi: tarif & jatah tidak boleh negatif
  if (tarifDefault < 0 || jatahKaryawan < 0) {
    return { error: "Tarif dan jatah karyawan tidak boleh negatif" }
  }

  // Validasi: jatah karyawan tidak boleh melebihi tarif total
  if (jatahKaryawan > tarifDefault) {
    return { error: "Jatah karyawan tidak boleh melebihi tarif total" }
  }

  // jatah_pemilik dihitung otomatis supaya selalu konsisten dengan
  // constraint database: jatah_karyawan + jatah_pemilik = tarif_default
  const jatahPemilik = tarifDefault - jatahKaryawan

  const { error } = await supabase
    .from("jenis_kendaraan")
    .update({
      tarif_default: tarifDefault,
      jatah_karyawan: jatahKaryawan,
      jatah_pemilik: jatahPemilik,
    })
    .eq("id", id)

  if (error) {
    console.error("Update tarif error:", error)
    return { error: "Gagal mengupdate tarif. Pastikan Anda memiliki akses admin." }
  }

  // Revalidate halaman kasir agar form transaksi pakai tarif terbaru
  revalidatePath("/", "layout")
  revalidatePath("/admin/tarif")
  return { success: true }
}

export async function toggleAktifJenisKendaraan(id: string, aktif: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("jenis_kendaraan")
    .update({ aktif })
    .eq("id", id)

  if (error) {
    console.error("Toggle aktif error:", error)
    return { error: "Gagal mengubah status. Pastikan Anda memiliki akses admin." }
  }

  revalidatePath("/", "layout")
  revalidatePath("/admin/tarif")
  return { success: true }
}

export async function createJenisKendaraan(params: {
  kategori: string
  ukuran: string
  tarifDefault: number
  jatahKaryawan: number
}) {
  const supabase = await createClient()

  const kategori = params.kategori.trim()
  const ukuran = params.ukuran.trim()

  if (!kategori || !ukuran) {
    return { error: "Kategori dan ukuran wajib diisi" }
  }
  if (params.tarifDefault < 0 || params.jatahKaryawan < 0) {
    return { error: "Tarif dan jatah karyawan tidak boleh negatif" }
  }
  if (params.jatahKaryawan > params.tarifDefault) {
    return { error: "Jatah karyawan tidak boleh melebihi tarif total" }
  }

  const jatahPemilik = params.tarifDefault - params.jatahKaryawan

  const { error } = await supabase.from("jenis_kendaraan").insert({
    kategori,
    ukuran,
    tarif_default: params.tarifDefault,
    jatah_karyawan: params.jatahKaryawan,
    jatah_pemilik: jatahPemilik,
    aktif: true,
  })

  if (error) {
    console.error("Create jenis kendaraan error:", error)
    if (error.code === "23505") {
      // unique constraint violation (kategori, ukuran)
      return { error: `Kategori "${kategori} ${ukuran}" sudah ada` }
    }
    return { error: "Gagal menambahkan jenis kendaraan. Pastikan Anda memiliki akses admin." }
  }

  revalidatePath("/", "layout")
  revalidatePath("/admin/tarif")
  return { success: true }
}