import { DashboardContent } from "@/features/dashboard/DashboardContent"
import { fetchOverviewStats } from "@/features/dashboard/actions"

export default async function AdminDashboard() {
  const stats = await fetchOverviewStats()
  return <DashboardContent stats={stats} />
}
