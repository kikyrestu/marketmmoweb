"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ChatsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new conversations page
    router.replace('/conversations')
  }, [router])

  return (
    <div className="container py-10">
      <div className="flex justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to conversations...</p>
        </div>
      </div>
    </div>
  )
}
