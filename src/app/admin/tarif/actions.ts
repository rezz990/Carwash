"use server"

import { revalidatePath } from "next/cache"
import pool from "@/lib/db"
import { requireAdmin } from "@/lib/authz"

export async function updateTarifDefault(id: string, tarifDefault: number, jatahKaryawan: number) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  if (tarifDefault < 0 || jatahKaryawan < 0) {
    return { error: "Tarif dan jatah karyawan tidak boleh negatif" }
  }
  if (jatahKaryawan > tarifDefault) {
    return { error: "Jatah karyawan tidak boleh melebihi tarif total" }
  }

  const jatahPemilik = tarifDefault - jatahKaryawan

  try {
    await pool.query(
      "UPDATE jenis_kendaraan SET tarif_default = ?, jatah_karyawan = ?, jatah_pemilik = ? WHERE id = ?",
      [tarifDefault, jatahKaryawan, jatahPemilik, id]
    )
  } catch (error) {
    console.error("Update tarif error:", error)
    return { error: "Gagal mengupdate tarif" }
  }

  revalidatePath("/", "layout")
  revalidatePath("/admin/tarif")
  return { success: true }
}

export async function toggleAktifJenisKendaraan(id: string, aktif: boolean) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  try {
    await pool.query("UPDATE jenis_kendaraan SET aktif = ? WHERE id = ?", [aktif, id])
  } catch (error) {
    console.error("Toggle aktif error:", error)
    return { error: "Gagal mengubah status" }
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
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

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

  try {
    await pool.query(
      "INSERT INTO jenis_kendaraan (id, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik, aktif) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [crypto.randomUUID(), kategori, ukuran, params.tarifDefault, params.jatahKaryawan, jatahPemilik, true]
    )
  } catch (error: any) {
    console.error("Create jenis kendaraan error:", error)
    if (error.code === "ER_DUP_ENTRY") {
      return { error: `Kategori "${kategori} ${ukuran}" sudah ada` }
    }
    return { error: "Gagal menambahkan jenis kendaraan" }
  }

  revalidatePath("/", "layout")
  revalidatePath("/admin/tarif")
  return { success: true }
}
