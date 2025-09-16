import { createNotification } from '@/lib/notifications'

// Example functions to create different types of notifications

export async function notifyBlogPost(userId: string, blogTitle: string, blogSlug: string) {
  return createNotification({
    userId,
    type: 'BLOG_POST',
    title: 'New Blog Post',
    message: `Check out the latest blog post: ${blogTitle}`,
    data: { blogSlug }
  })
}

export async function notifyInfoUpdate(userId: string, updateTitle: string, updateMessage: string) {
  return createNotification({
    userId,
    type: 'INFO_UPDATE',
    title: updateTitle,
    message: updateMessage
  })
}

export async function notifyChatMessage(recipientId: string, senderName: string, message: string, conversationId: string) {
  return createNotification({
    userId: recipientId,
    type: 'CHAT_MESSAGE',
    title: `Message from ${senderName}`,
    message: message.length > 50 ? message.substring(0, 50) + '...' : message,
    data: { conversationId, senderName }
  })
}

export async function notifyTransactionUpdate(userId: string, transactionType: string, itemName: string, status: string) {
  return createNotification({
    userId,
    type: 'TRANSACTION_UPDATE',
    title: 'Transaction Update',
    message: `Your ${transactionType} for ${itemName} is now ${status}`,
    data: { transactionType, itemName, status }
  })
}

export async function notifyFriendRequest(userId: string, requesterName: string, requesterId: string) {
  return createNotification({
    userId,
    type: 'FRIEND_REQUEST',
    title: 'Friend Request',
    message: `${requesterName} sent you a friend request`,
    data: { requesterId, requesterName }
  })
}

export async function notifySystemAlert(userId: string, alertTitle: string, alertMessage: string) {
  return createNotification({
    userId,
    type: 'SYSTEM_ALERT',
    title: alertTitle,
    message: alertMessage
  })
}
