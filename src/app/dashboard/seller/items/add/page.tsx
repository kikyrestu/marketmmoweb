import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { AddItemForm } from "@/components/items/add-item-form"

export default async function AddItemPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  if (session.user.role !== "SELLER") {
    redirect("/dashboard")
  }

  return <AddItemForm />
}
