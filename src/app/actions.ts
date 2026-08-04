"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export async function login(formData: FormData) {
  const supabase = await createClient()

  const username = formData.get("username") as string
  const email = `${username}@carwash.internal`

  const data = {
    email,
    password: formData.get("password") as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  redirect("/")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function submitTransaction(formData: FormData) {
  const supabase = await createClient()

  const jenisKendaraanId = formData.get("jenis_kendaraan_id") as string
  const platNomor = formData.get("plat_nomor") as string | null

  if (!jenisKendaraanId) {
    return { error: "Jenis kendaraan harus dipilih" }
  }

  // Fetch jenis kendaraan to get tarif_default
  const { data: jenisKendaraan, error: jkError } = await supabase
    .from("jenis_kendaraan")
    .select("tarif_default")
    .eq("id", jenisKendaraanId)
    .single()

  if (jkError || !jenisKendaraan) {
    return { error: "Gagal mengambil data tarif kendaraan" }
  }

  // Fetch konfigurasi split
  const { data: splitConfig, error: splitError } = await supabase
    .from("konfigurasi_split")
    .select("persen_karyawan, persen_pemilik")
    .order("berlaku_sejak", { ascending: false })
    .limit(1)
    .single()

  if (splitError || !splitConfig) {
    return { error: "Gagal mengambil konfigurasi pembagian tarif" }
  }

  const tarifTotal = jenisKendaraan.tarif_default
  const tarifJatahKaryawan = (tarifTotal * splitConfig.persen_karyawan) / 100
  const tarifJatahPemilik = (tarifTotal * splitConfig.persen_pemilik) / 100

  // Get current user (kasir)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Anda harus login untuk melakukan transaksi" }
  }

  // Insert transaksi
  const { error: insertError } = await supabase.from("transaksi").insert({
    jenis_kendaraan_id: jenisKendaraanId,
    plat_nomor: platNomor,
    tarif_total: tarifTotal,
    tarif_jatah_karyawan: tarifJatahKaryawan,
    tarif_jatah_pemilik: tarifJatahPemilik,
    kasir_id: user.id,
  })

  if (insertError) {
    console.error("Insert transaction error:", insertError)
    return { error: "Gagal menyimpan transaksi. Cek log server." }
  }

  revalidatePath("/")
  return { success: true }
}
