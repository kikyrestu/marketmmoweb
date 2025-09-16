"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { VerificationBadge } from "@/components/ui/verification-badge"
import { useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Separator as Hr } from '@/components/ui/separator'

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

export function ClientSideItemPage({ item }: { item: ItemDetails }) {
  const router = useRouter()
  const [startingChat, setStartingChat] = useState(false)
  const { data: session, status } = useSession()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const handleStartChat = async () => {
    if (!session?.user) {
      setShowLoginPrompt(true)
      return
    }
    if (startingChat) return
    setStartingChat(true)
    try {
      // Use the new conversation API (primary)
      const res = await fetch('/api/chats/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id })
      })
      if (!res.ok) throw new Error('Failed to start chat')
      const data = await res.json()
      router.push(`/conversations/${data.conversationId}?highlightItem=true`)
    } catch (e) {
      console.error(e)
      // Fallback to legacy messages API
      try {
        const res = await fetch('/api/messages/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientId: item.seller.id, itemId: item.id })
        })
        if (!res.ok) throw new Error('Failed to start legacy chat')
        const data = await res.json()
        router.push(`/conversations/${data.conversationId}?highlightItem=true`)
      } catch (fallbackError) {
        console.error('Both chat methods failed:', fallbackError)
        alert('Failed to start conversation')
      }
    } finally {
      setStartingChat(false)
    }
  }

  return (
    <div className="container py-10">
      <Card className="max-w-4xl mx-auto">
        <div className="md:grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="aspect-square relative">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <p className="text-muted-foreground">No image available</p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold">{item.name}</h1>
              <Badge variant={item.isAvailable ? "default" : "secondary"}>
                {item.isAvailable ? "Available" : "Sold"}
              </Badge>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-muted-foreground">Sold by {item.seller.name}</span>
              <VerificationBadge isVerified={item.seller.verificationStatus === "VERIFIED"} />
            </div>

            <Separator className="my-4" />

            <p className="text-muted-foreground whitespace-pre-wrap">
              {item.description}
            </p>

            <p className="mt-4 text-2xl font-bold">
              ${item.price.toLocaleString()}
            </p>

            <div className="mt-6 space-y-2">
              <Button
                className="w-full"
                disabled={!item.isAvailable}
                onClick={() => router.push(`/items/${item.id}/checkout`)}
              >
                {item.isAvailable ? "Buy Now" : "Not Available"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={startingChat}
                onClick={handleStartChat}
              >
                {startingChat ? 'Opening...' : 'Chat with Seller'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      <Dialog open={showLoginPrompt} onOpenChange={(o)=> setShowLoginPrompt(o)}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Login Required</DialogTitle>
            <DialogDescription>Masuk dulu untuk mulai chat dengan penjual.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4 text-sm'>
            <p className='text-muted-foreground'>Akun diperlukan untuk kirim pesan, negosiasi, dan riwayat percakapan.</p>
            <div className='flex gap-2'>
              <Button className='flex-1' onClick={()=> signIn(undefined, { callbackUrl: `/items/${item.id}` })}>Login</Button>
              <Button variant='outline' className='flex-1' onClick={()=> setShowLoginPrompt(false)}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
