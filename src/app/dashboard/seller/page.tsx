import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import SellerDashboard from "./seller-dashboard"

export const dynamic = 'force-dynamic'

export default async function DashboardSellerPage() {
  console.log("Rendering seller dashboard page...");
  
  try {
    const session = await getServerSession(authOptions);
    console.log("Session in seller dashboard:", session);

    if (!session?.user?.email) {
      console.log("No session or email, redirecting to signin");
      redirect("/auth/signin");
    }

    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      }
    });
    console.log("User data from database:", user);

    if (!user) {
      console.log("User not found in database");
      redirect("/auth/signin");
    }

    if (user.role !== "SELLER") {
      console.log("User is not a seller, redirecting to dashboard");
      redirect("/dashboard");
    }

    // If we get here, the user is definitely a seller
    console.log("Confirmed seller access, rendering dashboard...");
  } catch (error) {
    console.error("Error in seller dashboard:", error);
    redirect("/dashboard");
  }

  return <SellerDashboard />
}
