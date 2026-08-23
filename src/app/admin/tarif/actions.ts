"use server"

import { revalidatePath } from "next/cache"
import pool from "@/lib/db"
import type { RowDataPacket } from "mysql2"
import { requireAdmin } from "@/lib/authz"
import { logActivity, type ActivityActor } from "@/lib/activityLog"

function toActor(user: { id: string; username: string; role: string } | null): ActivityActor {
  if (!user) return null
  return { id: user.id, username: user.username, role: user.role as "admin" | "kasir" }
}

export async function updateTarifDefault(id: string, tarifDefault: number, jatahKaryawan: number) {
  const { error: authError, user: currentUser } = await requireAdmin()
  if (authError) return { error: authError }

  if (tarifDefault < 0 || jatahKaryawan < 0) {
    return { error: "Tarif dan jatah karyawan tidak boleh negatif" }
  }
  if (jatahKaryawan > tarifDefault) {
    return { error: "Jatah karyawan tidak boleh melebihi tarif total" }
  }

  const jatahPemilik = tarifDefault - jatahKaryawan

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik FROM jenis_kendaraan WHERE id = ? LIMIT 1",
      [id]
    )
    const target = rows[0]

    await pool.query(
      "UPDATE jenis_kendaraan SET tarif_default = ?, jatah_karyawan = ?, jatah_pemilik = ? WHERE id = ?",
      [tarifDefault, jatahKaryawan, jatahPemilik, id]
    )

    await logActivity({
      actor: toActor(currentUser as any),
      action: "UPDATE",
      entityType: "tarif",
      entityId: id,
      description: `Mengubah tarif "${target?.kategori ?? "?"} ${target?.ukuran ?? "?"}" menjadi Rp${tarifDefault.toLocaleString("id-ID")}`,
      oldValue: target
        ? {
            tarif_default: Number(target.tarif_default),
            jatah_karyawan: Number(target.jatah_karyawan),
            jatah_pemilik: Number(target.jatah_pemilik),
          }
        : undefined,
      newValue: { tarif_default: tarifDefault, jatah_karyawan: jatahKaryawan, jatah_pemilik: jatahPemilik },
    })
  } catch (error) {
    console.error("Update tarif error:", error)
    return { error: "Gagal mengupdate tarif" }
  }

  revalidatePath("/", "layout")
  revalidatePath("/admin/tarif")
  return { success: true }
}

export async function toggleAktifJenisKendaraan(id: string, aktif: boolean) {
  const { error: authError, user: currentUser } = await requireAdmin()
  if (authError) return { error: authError }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT kategori, ukuran, aktif FROM jenis_kendaraan WHERE id = ? LIMIT 1",
      [id]
    )
    const target = rows[0]

    await pool.query("UPDATE jenis_kendaraan SET aktif = ? WHERE id = ?", [aktif, id])

    await logActivity({
      actor: toActor(currentUser as any),
      action: "UPDATE",
      entityType: "tarif",
      entityId: id,
      description: `${aktif ? "Mengaktifkan" : "Menonaktifkan"} jenis kendaraan "${target?.kategori ?? "?"} ${target?.ukuran ?? "?"}"`,
      oldValue: target ? { aktif: Boolean(target.aktif) } : undefined,
      newValue: { aktif },
    })
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
  const { error: authError, user: currentUser } = await requireAdmin()
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
  const newId = crypto.randomUUID()

  try {
    await pool.query(
      "INSERT INTO jenis_kendaraan (id, kategori, ukuran, tarif_default, jatah_karyawan, jatah_pemilik, aktif) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [newId, kategori, ukuran, params.tarifDefault, params.jatahKaryawan, jatahPemilik, true]
    )
  } catch (error: any) {
    console.error("Create jenis kendaraan error:", error)
    if (error.code === "ER_DUP_ENTRY") {
      return { error: `Kategori "${kategori} ${ukuran}" sudah ada` }
    }
    return { error: "Gagal menambahkan jenis kendaraan" }
  }

  await logActivity({
    actor: toActor(currentUser as any),
    action: "CREATE",
    entityType: "tarif",
    entityId: newId,
    description: `Menambahkan jenis kendaraan baru "${kategori} ${ukuran}"`,
    newValue: { kategori, ukuran, tarif_default: params.tarifDefault, jatah_karyawan: params.jatahKaryawan, jatah_pemilik: jatahPemilik },
  })

  revalidatePath("/", "layout")
  revalidatePath("/admin/tarif")
  return { success: true }
}
