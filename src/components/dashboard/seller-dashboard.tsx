"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface Item {
  id: string
  name: string
  price: number
  description: string
  isAvailable: boolean
  imageUrl?: string
  _count: {
    transactions: number
  }
}

export function SellerDashboard() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch("/api/seller/items")
        if (!response.ok) throw new Error("Failed to fetch items")
        const data = await response.json()
        setItems(data)
      } catch (err) {
        setError("Failed to load items")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Items</h1>
        <Link href="/dashboard/items/new">
          <Button>Add New Item</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <Card key={item.id}>
            {item.imageUrl && (
              <div className="relative w-full h-48">
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" unoptimized />
              </div>
            )}
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-2">{item.description}</p>
              <p className="font-bold">${item.price}</p>
              <p className="text-sm text-gray-500">
                Sales: {item._count.transactions}
              </p>
              <p className={item.isAvailable ? "text-green-600" : "text-red-600"}>
                {item.isAvailable ? "Available" : "Not Available"}
              </p>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Link href={`/dashboard/items/${item.id}/edit`}>
                <Button variant="outline">Edit</Button>
              </Link>
              <Link href={`/dashboard/items/${item.id}`}>
                <Button>View Details</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
