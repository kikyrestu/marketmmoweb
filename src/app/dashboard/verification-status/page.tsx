import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SellerVerificationStatus } from "@/components/seller/seller-verification-status"


export default async function VerificationStatusPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  const email = session.user.email ?? undefined
  if (!email) {
    redirect("/auth/signin")
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { sellerVerification: true }
  })

  if (!user) {
    redirect("/auth/signin")
  }

  if (!user.sellerVerification) {
    redirect("/dashboard/seller/verify")
  }

  return <SellerVerificationStatus verification={user.sellerVerification} />
}
