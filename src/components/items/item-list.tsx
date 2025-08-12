"use client"

import { useState, useEffect } from 'react'

interface Item {
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
import { ItemCard } from '@/components/items/item-card'

export default function ItemList() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('🔍 Starting to fetch items...')
    fetch('/api/items')
      .then(res => {
        console.log('📡 API Response status:', res.status)
        return res.json()
      })
      .then(data => {
        console.log('📦 API Response data:', data)
        if (!Array.isArray(data)) {
          console.warn('⚠️ Data is not an array:', typeof data)
          setItems([])
        } else {
          console.log('✅ Found', data.length, 'items')
          setItems(data)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('❌ Error fetching items:', err)
        setError('Failed to load items')
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-4 text-center">Loading...</div>
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>

  if (items.length === 0) {
    return <div className="text-center text-sm text-muted-foreground py-8">No items available yet.</div>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map(item => (
        <ItemCard key={item.id} {...item} />
      ))}
    </div>
  )
}
