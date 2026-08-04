"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/utils/supabase/server"

export async function updateTarifDefault(id: string, tarifDefault: number) {
  const supabase = await createClient()

  // Validasi: tarif tidak boleh negatif
  if (tarifDefault < 0) {
    return { error: "Tarif tidak boleh negatif" }
  }

  const { error } = await supabase
    .from("jenis_kendaraan")
    .update({ tarif_default: tarifDefault })
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
