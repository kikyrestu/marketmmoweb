"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { MoreVertical, Plus } from "lucide-react"

type SellerItem = {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string | null
  isAvailable: boolean
  createdAt: string
  _count: {
    transactions: number
  }
}

export default function SellerDashboardPage() {
  const router = useRouter()
  const [items, setItems] = useState<SellerItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch("/api/seller/items")
        if (!res.ok) {
          throw new Error("Failed to fetch items")
        }
        const data = await res.json()
        setItems(data)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Something went wrong")
      } finally {
        setIsLoading(false)
      }
    }

    fetchItems()
  }, [])

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return
    }

    try {
      const res = await fetch(`/api/seller/items/${itemId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Failed to delete item")
      }

      setItems((prev) => prev.filter((item) => item.id !== itemId))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete item")
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

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Items</h1>
        <Button onClick={() => router.push("/seller/items/new")}>
          <Plus className="w-4 h-4 mr-2" />
          New Item
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <p>You haven't listed any items yet</p>
            <Button
              variant="link"
              onClick={() => router.push("/seller/items/new")}
            >
              Create your first listing
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {/* Item Image */}
              {item.imageUrl ? (
                <div className="aspect-video relative">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">No image</span>
                </div>
              )}

              {/* Item Details */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold truncate">{item.name}</h3>
                    <p className="text-lg font-medium">
                      ${item.price.toLocaleString()}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/seller/items/${item.id}/edit`)}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-2 space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.isAvailable ? "default" : "secondary"}>
                      {item.isAvailable ? "Available" : "Sold"}
                    </Badge>
                    {item._count.transactions > 0 && (
                      <Badge variant="outline">
                        {item._count.transactions} sale{item._count.transactions > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  Listed on{" "}
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                  }).format(new Date(item.createdAt))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
