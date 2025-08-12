import { notFound } from "next/navigation"
import { ClientSideItemPage } from "./client-page"

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

async function getItem(id: string): Promise<ItemDetails> {
  // Use environment base URL if provided, else construct from relative (Next.js will handle internal fetch)
  const base = process.env.NEXT_PUBLIC_API_URL || ''
  const url = base ? `${base.replace(/\/$/, '')}/api/items/${id}` : `${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/items/${id}`
  // If still falsy (no env), fallback to relative path
  const finalUrl = url.startsWith('http') ? url : `/api/items/${id}`
  const res = await fetch(finalUrl, { cache: 'no-store' })
  
  if (!res.ok) {
    if (res.status === 404) {
      notFound()
    }
    throw new Error("Failed to fetch item")
  }
  
  return res.json()
}

export default async function ItemPage({ params }: { params: { id: string } }) {
  const item = await getItem(params.id)
  return <ClientSideItemPage item={item} />
}
