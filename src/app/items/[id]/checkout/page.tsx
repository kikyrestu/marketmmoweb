"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type CheckoutItem = {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string | null
  seller: {
    id: string
    name: string
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<CheckoutItem | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchItem = async () => {
      try {
  const res = await fetch(`/api/items/${id}`)
        if (!res.ok) {
          throw new Error("Failed to fetch item")
        }
        const data = await res.json()
        if (!data.isAvailable) {
          throw new Error("This item is no longer available")
        }
        setItem(data)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Something went wrong")
      } finally {
        setIsLoading(false)
      }
    }

    fetchItem()
  }, [id])

  const handleCheckout = async () => {
    if (!item) return

    setIsProcessing(true)
    setError("")

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          itemId: item.id,
          quantity,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message)
      }

      const transaction = await res.json()
      router.push(`/transactions/${transaction.id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to process transaction")
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="container py-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const totalPrice = item.price * quantity

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      
      <div className="space-y-6">
        {/* Item Summary */}
        <Card className="p-6">
          <div className="flex gap-4">
            {item.imageUrl && (
              <div className="relative w-24 h-24">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover rounded-md"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-muted-foreground">
                Sold by {item.seller.name}
              </p>
              <p className="font-medium mt-1">
                ${item.price.toLocaleString()}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="max-w-[100px]"
              />
            </div>

            <div className="flex justify-between items-center font-medium">
              <span>Total Price</span>
              <span>${totalPrice.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          {error && (
            <div className="text-sm text-red-500 text-center">
              {error}
            </div>
          )}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : `Pay $${totalPrice.toLocaleString()}`}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.back()}
            disabled={isProcessing}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
