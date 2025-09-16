"use client"

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface MessagePreview {
  id: string
  item: {
    id: string
    name: string
    imageUrl?: string
    price: number
  } | null
  otherUser: {
    id: string
    name: string
  } | null
  lastMessage: {
    id: string
    body: string
    createdAt: string
    senderId: string
  } | null
  unreadCount: number
}

export function MessageDropdown() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<MessagePreview[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)

  useEffect(() => {
    if (session?.user) {
      loadMessages()
    }
  }, [session])

  const loadMessages = async () => {
    try {
      const response = await fetch('/api/chats')
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
        setTotalUnread(data.reduce((sum: number, msg: MessagePreview) => sum + msg.unreadCount, 0))
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  if (!session?.user) return null

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <MessageCircle className="w-5 h-5" />
        {totalUnread > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-hidden z-50 shadow-lg">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Messages</h3>
              <Link href="/conversations">
                <Button variant="ghost" size="sm" className="text-xs">
                  View All
                </Button>
              </Link>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No messages yet
              </div>
            ) : (
              messages.map((message) => (
                <Link
                  key={message.id}
                  href={`/conversations/${message.id}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm">
                            {message.otherUser?.name || 'Unknown User'}
                          </h4>
                          {message.unreadCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {message.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {message.item && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Re: {message.item.name}
                          </p>
                        )}
                        {message.lastMessage && (
                          <p className="text-sm text-muted-foreground">
                            {truncateMessage(message.lastMessage.body)}
                          </p>
                        )}
                        {message.lastMessage && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(message.lastMessage.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
