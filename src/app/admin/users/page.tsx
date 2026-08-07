import { createClient } from "@/utils/supabase/server"
import { UserTable } from "./UserTable"

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, username, nama_lengkap, role, aktif, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Fetch users error:", error)
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Kelola User</h1>
        <p className="text-slate-500 mt-2 text-base">
          Tambah, ubah role, reset password, atau nonaktifkan akun kasir/admin.
        </p>
      </div>

      <UserTable data={users || []} currentUserId={currentUser?.id || ""} />
    </div>
  )
}