import { fetchOverviewStats } from "./actions"
import { DashboardContent } from "./DashboardContent"

export default async function AdminDashboard() {
  const stats = await fetchOverviewStats()
  return <DashboardContent stats={stats} />
}