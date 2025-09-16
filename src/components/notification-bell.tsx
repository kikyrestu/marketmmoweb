"use client"

import { useState, useEffect } from 'react'
import { Bell, X, Check, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useSession } from 'next-auth/react'
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/notifications'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  status: 'UNREAD' | 'READ'
  createdAt: string
}

export function NotificationBell() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const currentUserId = session?.user?.id

  useEffect(() => {
    if (currentUserId) {
      loadNotifications()
    }
  }, [currentUserId])

  const loadNotifications = () => {
    if (!currentUserId) return
    const userNotifications = getUserNotifications(currentUserId)
    setNotifications(userNotifications)
    setUnreadCount(userNotifications.filter(n => n.status === 'UNREAD').length)
  }

  const handleMarkRead = (notificationId: string) => {
    if (!currentUserId) return
    markNotificationRead(currentUserId, notificationId)
    loadNotifications()
  }

  const handleMarkAllRead = () => {
    if (!currentUserId) return
    markAllNotificationsRead(currentUserId)
    loadNotifications()
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BLOG_POST': return 'bg-blue-500'
      case 'INFO_UPDATE': return 'bg-green-500'
      case 'CHAT_MESSAGE': return 'bg-purple-500'
      case 'TRANSACTION_UPDATE': return 'bg-orange-500'
      case 'FRIEND_REQUEST': return 'bg-pink-500'
      case 'SYSTEM_ALERT': return 'bg-red-500'
      default: return 'bg-gray-500'
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

  if (!currentUserId) return null

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-hidden z-50 shadow-lg">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-xs"
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b last:border-b-0 ${
                    notification.status === 'UNREAD' ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getTypeColor(notification.type)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        {notification.status === 'UNREAD' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkRead(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
