"use client"

import { useState } from "react"
import Link from "next/link"
import Image from 'next/image'
import { useRouter } from "next/navigation"
import { Item, Category } from "@prisma/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"

type ItemWithCategory = Item & {
  category: Category | null
}

interface SellerItemListProps {
  items: ItemWithCategory[]
}

export function SellerItemList({ items }: SellerItemListProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return
    }

    setIsDeleting(itemId)
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to delete item")
      }

      toast.success("Item deleted successfully")
      router.refresh()
    } catch (error) {
      toast.error("Failed to delete item")
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Items</h1>
          <Button onClick={() => router.push("/dashboard/seller/items/add")}>
            Add New Item
          </Button>
        </div>      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <h3 className="text-lg font-medium">No items yet</h3>
              <p className="text-muted-foreground mt-1">
                Add your first item to start selling
              </p>
              <Button
                className="mt-4"
                onClick={() => router.push("/dashboard/seller/items/add")}
              >
                Add New Item
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id}>
              {item.imageUrl && (
                <div className="relative w-full h-48">
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{item.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {item.category?.name}
                  </span>
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${item.price}</div>
                <div className={`text-sm mt-2 ${item.isAvailable ? "text-green-600" : "text-red-600"}`}>
                  {item.isAvailable ? "Available" : "Not Available"}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleDelete(item.id)}
                  disabled={isDeleting === item.id}
                >
                  {isDeleting === item.id ? "Deleting..." : "Delete"}
                </Button>
                <Button
                  variant="default"
                  onClick={() => router.push(`/dashboard/items/${item.id}/edit`)}
                >
                  Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
