import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SellerItemList } from "@/components/items/seller-item-list"

export default async function SellerItemsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/signin")
  }

  if (session.user.role !== "SELLER") {
    redirect("/dashboard")
  }

  // Ensure email is a non-null string for Prisma filter
  const email = session.user.email ?? undefined
  if (!email) {
    return <SellerItemList items={[]} />
  }

  const items = await prisma.item.findMany({
    where: {
      seller: {
        email
      }
    },
    include: {
      category: true
    },
    orderBy: {
      createdAt: "desc"
    }
  })

  return <SellerItemList items={items} />
}
