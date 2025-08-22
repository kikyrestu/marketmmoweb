"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ItemCard } from "@/components/items/item-card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmptyState } from "@/components/ui/empty-state"

type Item = {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string | null
  isAvailable: boolean
  seller: {
  name: string
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | null
  }
}

export default function BrowsePage() {
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch("/api/items")
        if (!res.ok) {
          throw new Error("Failed to fetch items")
        }
        const data = await res.json()
        setItems(data)
      } catch (error) {
        setError("Failed to load items")
      } finally {
        setIsLoading(false)
      }
    }

    fetchItems()
  }, [])

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex justify-center">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-10">
        <EmptyState
          title="Error"
          description={error}
        />
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="flex flex-col space-y-8">
        {/* Search and Filter Section */}
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="outline">
            Filter
          </Button>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <EmptyState
            title="No items found"
            description={search ? "Try different search terms" : "No items are currently available"}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} {...item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
