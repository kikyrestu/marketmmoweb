"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Price must be a positive number",
  }),
  // We no longer collect imageUrl manually; file upload handled outside RHF validation
  imageUrl: z.string().optional(),
})

export function AddItemForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
  imageUrl: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true)
      setFileError(null)

      // Validate file (optional)
      if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
          setFileError("File size must be under 2MB")
          setIsSubmitting(false)
          return
        }
        if (!file.type.startsWith("image/")) {
          setFileError("File must be an image")
          setIsSubmitting(false)
          return
        }
      }

      const formData = new FormData()
      formData.append("name", values.name)
      formData.append("description", values.description)
      formData.append("price", String(Number(values.price)))
      formData.append("isAvailable", "true")
      if (file) formData.append("image", file)

      const response = await fetch("/api/items", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to add item")
      }

  toast.success("Item added successfully")
  router.push("/dashboard/seller/items")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add item")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add New Item</h1>
        <p className="text-muted-foreground">Fill in the details of your new item</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter item name" {...field} />
                </FormControl>
                <FormDescription>
                  The name of your item as it will appear to buyers
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter item description"
                    {...field}
                    rows={4}
                  />
                </FormControl>
                <FormDescription>
                  Describe your item in detail to help buyers understand what they&apos;re getting
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter price"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Set the price in dollars (USD)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Image (optional)</FormLabel>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null
                setFile(f)
                setFileError(null)
                if (f) {
                  const url = URL.createObjectURL(f)
                  setPreview(url)
                } else {
                  setPreview(null)
                }
              }}
            />
            {fileError && <p className="text-sm text-destructive">{fileError}</p>}
      {preview && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Preview:</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Preview" className="h-32 w-32 object-cover rounded border" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">Max 2MB. JPG / PNG / WebP.</p>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/seller/items")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
