"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Transaction {
  id: string
  totalPrice: number
  status: string
  createdAt: string
  item: {
    id: string
    name: string
    imageUrl?: string
    seller: {
      name: string
    }
  }
}

export function BuyerDashboardNew() {
  const router = useRouter()
  
  // Define all hooks at the top level
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [userInfo, setUserInfo] = useState<{
    isVerified: boolean
    verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | null
    role: "USER" | "SELLER" | "ADMIN" | null
  }>({
    isVerified: false,
    verificationStatus: null,
    role: "USER"
  })
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalItems: 0,
    pendingTransactions: 0
  })

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch("/api/user/me")
        if (!res.ok) throw new Error("Failed to fetch user info")
        const data = await res.json()
        setUserInfo({
          isVerified: data.isVerified || false,
          verificationStatus: data.verificationStatus || null,
          role: data.role
        })
      } catch (error) {
        console.error("Error fetching user info:", error)
      }
    }
    fetchUserInfo()
  }, [])

  // Data fetching effect
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch("/api/transactions")
        if (!response.ok) throw new Error("Failed to fetch transactions")
        const data = await response.json()
        setTransactions(data)
        
        // Calculate statistics
        const totalSpent = data.reduce((sum: number, t: Transaction) => sum + t.totalPrice, 0)
        const pendingTransactions = data.filter((t: Transaction) => t.status === "PENDING").length
        
        setStats({
          totalSpent,
          totalItems: data.length,
          pendingTransactions
        })
      } catch (err) {
        setError("Failed to load transactions")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const handleVerifiedSeller = () => {
    // Redirect to seller verification form
    window.location.href = "/dashboard/seller-verification"
  }

  const handleUpgradeToSeller = async () => {
    console.log("Starting upgrade process...")
    setIsUpgrading(true)
    
    try {
      // Step 1: Upgrade user to seller
      const upgradeResponse = await fetch("/api/user/upgrade-to-seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipVerification: true })
      })
      
      console.log("Upgrade response:", upgradeResponse.status)
      
      if (!upgradeResponse.ok) {
        throw new Error("Failed to upgrade to seller")
      }
      
      // Step 2: Show success message
      toast.success("Successfully upgraded to seller mode! Redirecting...")
      
  // IMPORTANT: We must invalidate the existing session token so middleware sees the new role.
  // For JWT strategy, easiest is to sign the user out so they re-authenticate and get a fresh token.
  // We redirect to signout endpoint with a callback to the signin page, which itself has a callback to seller dashboard.
  // Double encoding to preserve nested callback.
  const callbackAfterSignIn = encodeURIComponent('/dashboard/seller')
  const signInUrl = `/auth/signin?callbackUrl=${callbackAfterSignIn}`
  const finalUrl = `/api/auth/signout?callbackUrl=${encodeURIComponent(signInUrl)}`
  console.log("Forcing sign out to refresh session, redirecting to:", finalUrl)
  window.location.href = finalUrl
    } catch (error) {
      console.error("Error upgrading to seller:", error)
      toast.error("Failed to upgrade to seller mode")
    } finally {
      setIsUpgrading(false)
      setIsDialogOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Buyer Dashboard</h1>
          {userInfo.role === "USER" ? (
            <DialogTrigger asChild>
              <Button 
                variant="default"
                className="group"
              >
                <span>Become a Seller</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 opacity-70 group-hover:opacity-100 transition-opacity">
                  <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
                </svg>
              </Button>
            </DialogTrigger>
          ) : userInfo.role === "SELLER" && (
            <Button 
              variant="default"
              className="group"
              onClick={() => {
                // Force full page navigation 
                console.log("Force navigation to seller dashboard")
                // Use direct browser navigation to avoid Next.js router
                const url = new URL("/dashboard/seller", window.location.origin)
                window.location.assign(url.toString())
              }}
            >
              <span>Go to Seller Dashboard</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 opacity-70 group-hover:opacity-100 transition-opacity">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </Button>
          )}
        </div>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Become a Seller</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose how you want to become a seller:
            </DialogDescription>
            <div className="text-left space-y-4 mt-4">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Verified Seller:</strong> Complete verification process with required documents (KTP, Selfie, Bank Account)</li>
                <li><strong>Unverified Seller:</strong> Start selling immediately with limited features</li>
              </ul>
            </div>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-end gap-2 mt-6">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="secondary"
              onClick={handleUpgradeToSeller}
              disabled={isUpgrading}
            >
              {isUpgrading ? "Processing..." : "Skip Verification"}
            </Button>
            <Button
              variant="default"
              onClick={handleVerifiedSeller}
              disabled={isUpgrading}
            >
              Verify Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Items Purchased</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalItems}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pendingTransactions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          <Link href="/transactions">
            <Button variant="outline">View All</Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.slice(0, 5).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {transaction.item.imageUrl && (
                          <img
                            src={transaction.item.imageUrl}
                            alt={transaction.item.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        {transaction.item.name}
                      </div>
                    </TableCell>
                    <TableCell>{transaction.item.seller.name}</TableCell>
                    <TableCell>${transaction.totalPrice}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-sm ${
                        transaction.status === "COMPLETED" 
                          ? "bg-green-100 text-green-800"
                          : transaction.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {transaction.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/transactions/${transaction.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="relative w-16 h-16 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="absolute inset-0 text-muted-foreground/20">
                          <path d="M21 8v13H3V8"/>
                          <path d="M1 3h22v5H1z"/>
                          <path d="M10 12h4"/>
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-muted-foreground">No transactions yet</p>
                      <p className="text-sm text-muted-foreground mt-1">When you make a purchase, it will show up here</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
