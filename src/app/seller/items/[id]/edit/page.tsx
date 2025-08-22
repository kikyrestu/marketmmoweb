"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type Category = {
  id: string
  name: string
}

type ItemDetails = {
  id: string
  name: string
  description: string
  price: number
  imageUrl: string | null
  isAvailable: boolean
  categoryId: string
}

export default function EditItemPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<ItemDetails | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await fetch(`/api/seller/items/${id}`)
        if (!res.ok) {
          throw new Error("Failed to fetch item")
        }
        const data = await res.json()
        setItem(data)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Something went wrong")
      } finally {
        setIsLoading(false)
      }
    }

    fetchItem()
  }, [id])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const price = parseFloat(formData.get("price") as string)
    const categoryId = formData.get("category") as string
    const imageFile = formData.get("image") as File

    try {
      // Upload new image if provided
      let imageUrl = item?.imageUrl
      if (imageFile.size > 0) {
        const imageFormData = new FormData()
        imageFormData.append("file", imageFile)

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: imageFormData,
        })

        if (!uploadRes.ok) {
          throw new Error("Failed to upload image")
        }

        const { url } = await uploadRes.json()
        imageUrl = url
      }

      // Update item
      const res = await fetch(`/api/seller/items/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          price,
          categoryId,
          imageUrl,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to update item")
      }

      router.push("/seller/items")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsSaving(false)
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

  if (!item) {
    return (
      <div className="container py-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Error</h2>
          <p className="text-muted-foreground">{error || "Item not found"}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push("/seller/items")}
          >
            Back to Items
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Edit Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={item.name}
                placeholder="Enter item name"
                required
              />
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={item.description}
                placeholder="Describe your item"
                rows={4}
                required
              />
            </div>

            {/* Price Input */}
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5">$</span>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={item.price}
                  className="pl-7"
                  required
                />
              </div>
            </div>

            {/* Category Select */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue={item.categoryId} required>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weapons">Weapons</SelectItem>
                  <SelectItem value="armor">Armor</SelectItem>
                  <SelectItem value="potions">Potions</SelectItem>
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="accessories">Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="image">Image</Label>
              <Input
                id="image"
                name="image"
                type="file"
                accept="image/*"
              />
              <p className="text-xs text-muted-foreground">
                Optional. Leave empty to keep current image.
                Maximum file size 5MB. Supported formats: JPG, PNG
              </p>
            </div>

            {error && (
              <div className="text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
