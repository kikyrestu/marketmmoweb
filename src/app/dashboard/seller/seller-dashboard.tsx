"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState } from "react"

export default function SellerDashboard() {
  const router = useRouter()
  const [isDowngrading, setIsDowngrading] = useState(false)

  const handleDowngrade = async () => {
    if (!confirm("Are you sure you want to switch back to buyer mode? You can always become a seller again later.")) {
      return
    }

    setIsDowngrading(true)
    try {
      const response = await fetch("/api/seller/downgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message)
      }

      toast.success("Successfully switched to buyer mode")
      router.push("/dashboard")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to switch to buyer mode")
    } finally {
      setIsDowngrading(false)
    }
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Seller Dashboard</h1>
        <Button 
          variant="outline" 
          onClick={handleDowngrade}
          disabled={isDowngrading}
        >
          {isDowngrading ? "Switching..." : "Switch to Buyer Mode"}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Listings</CardTitle>
            <CardDescription>Your current active items for sale</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Orders</CardTitle>
            <CardDescription>Orders waiting to be processed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
            <CardDescription>Your lifetime sales</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">Rp 0</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Manage Items</CardTitle>
            <CardDescription>Add, edit or remove your items for sale</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button 
              className="flex-1"
              onClick={() => router.push('/dashboard/seller/items/add')}
            >
              Add New Item
            </Button>
            <Button 
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/dashboard/seller/items')}
            >
              View Items
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>View Orders</CardTitle>
            <CardDescription>Manage your pending and completed orders</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">Go to Orders</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
