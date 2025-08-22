"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type TransactionDetails = {
  id: string
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "REFUNDED"
  quantity: number
  totalPrice: number
  createdAt: string
  item: {
    id: string
    name: string
    price: number
    imageUrl: string | null
  }
  seller: {
    name: string
  }
  buyer: {
    name: string
  }
}

const statusConfig = {
  PENDING: {
    label: "Pending",
    variant: "default" as const,
    description: "Waiting for seller to process your order",
  },
  PROCESSING: {
    label: "Processing",
    variant: "default" as const,
    description: "Seller is processing your order",
  },
  COMPLETED: {
    label: "Completed",
    variant: "default" as const,
    description: "Transaction completed successfully",
  },
  CANCELLED: {
    label: "Cancelled",
    variant: "destructive" as const,
    description: "Transaction was cancelled",
  },
  REFUNDED: {
    label: "Refunded",
    variant: "destructive" as const,
    description: "Transaction was refunded",
  },
}

export default function TransactionPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
  const res = await fetch(`/api/transactions/${id}`)
        if (!res.ok) {
          throw new Error("Failed to fetch transaction")
        }
        const data = await res.json()
        setTransaction(data)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Something went wrong")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransaction()
  }, [id])

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="container py-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push("/transactions")}
          >
            View All Transactions
          </Button>
        </div>
      </div>
    )
  }

  const status = statusConfig[transaction.status]
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(transaction.createdAt))

  return (
    <div className="container max-w-2xl py-10">
      <div className="space-y-6">
        {/* Status Card */}
        <Card className="p-6">
          <div className="text-center space-y-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <p className="text-muted-foreground">{status.description}</p>
          </div>
        </Card>

        {/* Transaction Details */}
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Transaction Details</h2>
          
          <div className="space-y-4">
            {/* Item Details */}
            <div className="flex gap-4">
              {transaction.item.imageUrl && (
                <div className="relative w-24 h-24">
                  <Image
                    src={transaction.item.imageUrl}
                    alt={transaction.item.name}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
              )}
              <div>
                <h3 className="font-medium">{transaction.item.name}</h3>
                <p className="text-sm text-muted-foreground">
                  ${transaction.item.price.toLocaleString()} × {transaction.quantity}
                </p>
              </div>
            </div>

            <Separator />

            {/* Price Details */}
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${transaction.totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium mt-2">
                <span>Total</span>
                <span>${transaction.totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <Separator />

            {/* Other Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono">{transaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seller</span>
                <span>{transaction.seller.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buyer</span>
                <span>{transaction.buyer.name}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/transactions")}
          >
            View All Transactions
          </Button>
        </div>
      </div>
    </div>
  )
}
