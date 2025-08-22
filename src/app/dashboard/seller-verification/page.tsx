import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { SellerVerificationForm } from "@/components/seller/verification-form"

export default async function SellerVerificationPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <SellerVerificationForm />
  )
}
