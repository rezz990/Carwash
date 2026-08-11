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

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  // Cek role user untuk memastikan admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single()

  const role = profile?.role || "kasir"
  
  if (role !== "admin") {
    await supabase.auth.signOut()
    return { error: "Akses ditolak. Aplikasi ini sekarang hanya untuk admin." }
  }

  revalidatePath("/", "layout")
  redirect("/admin")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
