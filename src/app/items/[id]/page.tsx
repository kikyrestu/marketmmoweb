import { notFound } from "next/navigation"
import { ClientSideItemPage } from "./client-page"
import { prisma } from '@/lib/prisma'

type ItemDetails = {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string | null
  isAvailable: boolean
  seller: {
    id: string
    name: string
    verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | null
  }
  createdAt: string
}

async function getItem(id: string) {
  const item = await prisma.item.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      isAvailable: true,
      createdAt: true,
      seller: { select: { id: true, name: true, verificationStatus: true } }
    }
  })
  if (!item) notFound()
  return { ...item, createdAt: item.createdAt.toISOString() }
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getItem(id)
  return <ClientSideItemPage item={item as any} />
}
