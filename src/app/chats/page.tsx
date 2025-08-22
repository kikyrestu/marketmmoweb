"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

type ChatPreview = {
  userId: string
  userName: string
  lastMessage: {
    content: string
    createdAt: string
    isFromUser: boolean
  }
  unreadCount: number
}

export default function ChatsPage() {
  const router = useRouter()
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch("/api/chats")
        if (!res.ok) {
          throw new Error("Failed to fetch chats")
        }
        const data = await res.json()
        setChats(data)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Something went wrong")
      } finally {
        setIsLoading(false)
      }
    }

    fetchChats()
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
        <div className="text-center">
          <h2 className="text-2xl font-bold">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      {chats.length === 0 ? (
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            No messages yet
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {chats.map((chat) => (
            <Link key={chat.userId} href={`/chats/${chat.userId}`}>
              <Card className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{chat.userName}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {chat.lastMessage.isFromUser ? "You: " : ""}
                      {chat.lastMessage.content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(chat.lastMessage.createdAt))}
                    </p>
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
