import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { BuyerDashboardNew } from "@/components/dashboard/buyer-dashboard-new"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  // Redirect based on user role
  // Only redirect SELLER and ADMIN
  if (session.user?.role === "SELLER") {
    redirect("/dashboard/seller")
  } else if (session.user?.role === "ADMIN") {
    redirect("/admin")
  }

  // For regular users (USER role), show the dashboard
  return <BuyerDashboardNew />
}
