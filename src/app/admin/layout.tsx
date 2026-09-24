import { redirect } from "next/navigation"
import { AdminShell } from "@/components/admin/AdminShell"
import { getCurrentUser } from "@/lib/authz"
import { getLoginTimeoutMinutes } from "@/lib/loginTimeout"

export const dynamic = "force-dynamic"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    redirect("/login")
  }

  const loginTimeoutMinutes = await getLoginTimeoutMinutes()

  return (
    <AdminShell name={user.nama_lengkap || user.username} loginTimeoutMinutes={loginTimeoutMinutes}>
      {children}
    </AdminShell>
  )
}
