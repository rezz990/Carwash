import { UserTable } from "@/features/users/UserTable"
import { fetchUsers } from "@/features/users/actions"
import { getCurrentUser } from "@/lib/authz"

export default async function UsersPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== "admin") return null

  const { data: users, error: loadError } = await fetchUsers()

  return (
    <div className="mx-auto max-w-7xl space-y-5 sm:space-y-7">
      <header>
        <p className="text-sm font-medium text-slate-500">Akses tim</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Kelola user</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Tambah kasir atau admin, atur akses, reset password, dan nonaktifkan akun tanpa menghapus histori transaksi.
        </p>
      </header>
      <UserTable data={users} currentUserId={currentUser.id} loadError={loadError} />
    </div>
  )
}
