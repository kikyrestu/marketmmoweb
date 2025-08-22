"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Type untuk transaksi
type Transaction = {
  id: string
  item: {
    id: string
    name: string
    price: number
  }
  seller: {
    name: string
  }
  buyer: {
    name: string
  }
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "REFUNDED"
  createdAt: string
}

export default function TransactionsPage() {
  const { data: session } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch("/api/transactions")
        if (!res.ok) {
          throw new Error("Failed to fetch transactions")
        }
        const data = await res.json()
        setTransactions(data)
      } catch (error) {
        setError("Failed to load transactions")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [])

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

  if (transactions.length === 0) {
    return (
      <div className="container py-10">
        <EmptyState
          title="No transactions yet"
          description="When you buy or sell items, they will appear here."
        >
          <Button
            onClick={() => window.location.href = "/browse"}
            className="mt-4"
          >
            Browse Items
          </Button>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">My Transactions</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Price</TableHead>
              {((session?.user?.role as string | undefined) === "BUYER") ? (
                <TableHead>Seller</TableHead>
              ) : (
                <TableHead>Buyer</TableHead>
              )}
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.item.name}</TableCell>
                <TableCell>${transaction.item.price.toLocaleString()}</TableCell>
                <TableCell>
                  {((session?.user?.role as string | undefined) === "BUYER")
                    ? transaction.seller.name
                    : transaction.buyer.name}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${transaction.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                      transaction.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                      transaction.status === "PROCESSING" ? "bg-blue-100 text-blue-800" :
                      transaction.status === "CANCELLED" ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                    {transaction.status}
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(transaction.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `/transactions/${transaction.id}`}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
