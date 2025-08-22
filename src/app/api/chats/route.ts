import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"


export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      )
    }

    // Try new conversation model first
    try {
      const conversations = await (prisma as any).conversation.findMany({
        where: { participants: { some: { userId: user.id } } },
        orderBy: { lastMessageAt: 'desc' },
        select: {
          id: true,
            item: { select: { id: true, name: true, imageUrl: true, price: true } },
            participants: { select: { user: { select: { id: true, name: true } }, lastReadAt: true } },
            messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { id: true, body: true, createdAt: true, senderId: true } }
        }
      })
      const mapped = await Promise.all(conversations.map(async (c: any) => {
        const selfP = c.participants.find((p: any) => p.user.id === user.id)
        const lastReadAt = selfP?.lastReadAt
        const unread = await (prisma as any).chatMessage.count({ where: { conversationId: c.id, ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}) } })
        const other = c.participants.find((p: any) => p.user.id !== user.id)
        return {
          id: c.id,
          item: c.item,
          otherUser: other?.user || null,
          lastMessage: c.messages[0] || null,
          unreadCount: unread
        }
      }))
      return NextResponse.json(mapped)
    } catch (e) {
      console.warn('Conversation model fetch failed, fallback to legacy', e)
    }

    // Legacy fallback (kept for transition)
    const sentMessages = await prisma.message.findMany({
      where: {
        senderId: user.id
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const receivedMessages = await prisma.message.findMany({
      where: {
        receiverId: user.id
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const chatPreviews = new Map()

    // Process sent messages
    sentMessages.forEach((message) => {
      const userId = message.receiverId
      if (!chatPreviews.has(userId)) {
        chatPreviews.set(userId, {
          id: userId,
          item: null,
          otherUser: { id: userId, name: message.receiver.name },
          lastMessage: {
            id: message.id,
            body: message.content,
            createdAt: message.createdAt,
            senderId: message.senderId
          },
          unreadCount: 0
        })
      }
    })

    // Process received messages
    receivedMessages.forEach((message) => {
      const userId = message.senderId
      if (!chatPreviews.has(userId)) {
        chatPreviews.set(userId, {
          id: userId,
          item: null,
          otherUser: { id: userId, name: message.sender.name },
          lastMessage: {
            id: message.id,
            body: message.content,
            createdAt: message.createdAt,
            senderId: message.senderId
          },
          unreadCount: message.isRead ? 0 : 1
        })
      } else if (!message.isRead) {
        chatPreviews.get(userId).unreadCount++
      }
    })

    // Convert to array and sort by last message date
    const chats = Array.from(chatPreviews.values())
      .sort((a, b) => 
        new Date(b.lastMessage.createdAt).getTime() - 
        new Date(a.lastMessage.createdAt).getTime()
      )

    return NextResponse.json(chats)
  } catch (error) {
    console.error('Error fetching chats unified:', error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
