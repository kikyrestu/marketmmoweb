"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import Link from "next/link"

// LEGACY PAGE: akan digantikan oleh /conversations.

type Message = {
  id: string
  content: string
  createdAt: string
  senderId: string
  senderName: string
}

type ChatPartner = {
  id: string
  name: string
}

export default function ChatPage() {
  const router = useRouter()
  const { userId } = useParams<{ userId: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [partner, setPartner] = useState<ChatPartner | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (!userId) return
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chats/${userId}`)
        if (!res.ok) {
          throw new Error("Failed to fetch messages")
        }
        const data = await res.json()
        setMessages(data.messages)
        setPartner(data.partner)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Something went wrong")
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()
    // Set up polling for new messages
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => { scrollToBottom() }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending || !userId) return

    setIsSending(true)
    try {
      const res = await fetch(`/api/chats/${userId}`, {
        method: "POST",
        body: JSON.stringify({ content: newMessage }),
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error("Failed to send message")
      const message = await res.json()
      setMessages((prev) => [...prev, message])
      setNewMessage("")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to send message")
    } finally { setIsSending(false) }
  }

  if (isLoading) {
    return (
      <div className="container py-10"><div className="flex justify-center"><LoadingSpinner /></div></div>
    )
  }

  if (error) {
    return (
      <div className="container py-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push("/chats")}>Back to Messages</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-10">
      <Card className="p-4 mb-4 border-dashed border-amber-400 bg-amber-50/40">
        <p className="text-xs text-amber-600">
          Halaman chat legacy. Silakan pindah ke fitur baru: <Link className="underline" href="/conversations">/conversations</Link>
        </p>
      </Card>
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div><h1 className="font-semibold">{partner?.name}</h1></div>
          <Button variant="outline" size="sm" onClick={() => router.push("/chats")}>Back</Button>
        </div>
      </Card>
      <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto">
        {messages.map((message) => {
          const isOwnMessage = message.senderId !== userId
          return (
            <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-lg ${isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p className="break-words">{message.content}</p>
                <p className={`text-xs mt-1 ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "numeric" }).format(new Date(message.createdAt))}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <Card className="p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." disabled={isSending} />
          <Button type="submit" disabled={isSending}>Send</Button>
        </form>
      </Card>
    </div>
  )
}
