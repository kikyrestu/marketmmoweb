// Utility functions for creating notifications
import { notificationHub } from '@/lib/notificationHub'

export type NotificationType = 'BLOG_POST' | 'INFO_UPDATE' | 'CHAT_MESSAGE' | 'TRANSACTION_UPDATE' | 'FRIEND_REQUEST' | 'SYSTEM_ALERT'

export interface CreateNotificationData {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: any
}

// In-memory storage until database is ready
const tempNotifications = new Map<string, any[]>()

export async function createNotification(data: CreateNotificationData) {
  try {
    // For now, store in memory and broadcast via SSE
    // Later this will be replaced with database storage
    const { userId, type, title, message, data: extraData } = data

    const notification = {
      id: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId,
      type,
      title,
      message,
      data: extraData || {},
      status: 'UNREAD',
      createdAt: new Date().toISOString()
    }

    // Store in temporary memory
    if (!tempNotifications.has(userId)) {
      tempNotifications.set(userId, [])
    }
    tempNotifications.get(userId)!.push(notification)

    // Send real-time notification
    notificationHub.broadcastToUsers([userId], () => ({
      type: 'notification.new',
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt
      }
    }))

    return notification
  } catch (error) {
    console.error('Failed to create notification:', error)
    throw error
  }
}

export function getUserNotifications(userId: string) {
  return tempNotifications.get(userId) || []
}

export function markNotificationRead(userId: string, notificationId: string) {
  const userNotifications = tempNotifications.get(userId)
  if (userNotifications) {
    const notification = userNotifications.find(n => n.id === notificationId)
    if (notification) {
      notification.status = 'READ'
      notification.readAt = new Date().toISOString()
    }
  }
}

export function markAllNotificationsRead(userId: string) {
  const userNotifications = tempNotifications.get(userId)
  if (userNotifications) {
    userNotifications.forEach(n => {
      if (n.status === 'UNREAD') {
        n.status = 'READ'
        n.readAt = new Date().toISOString()
      }
    })
  }
}
