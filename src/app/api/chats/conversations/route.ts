import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const conversations = await (prisma as any).conversation.findMany({
      where: {
        participants: { some: { userId: user.id } }
      },
      orderBy: { lastMessageAt: 'desc' },
      select: {
        id: true,
        item: { select: { id: true, name: true, imageUrl: true, price: true } },
        participants: {
          select: {
            user: { select: { id: true, name: true } },
            lastReadMessageId: true,
            lastReadAt: true
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, body: true, createdAt: true, senderId: true }
        }
      }
    })

    // Compute unread counts
    const result = await Promise.all(conversations.map(async (c: any) => {
      const selfParticipant = c.participants.find((p: any) => p.user.id === user.id)
      const lastReadAt = selfParticipant?.lastReadAt
      const unread = await (prisma as any).chatMessage.count({
        where: {
          conversationId: c.id,
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {})
        }
      })
      const other = c.participants.find((p: any) => p.user.id !== user.id)
      return {
        id: c.id,
        item: c.item,
        otherUser: other?.user || null,
        lastMessage: c.messages[0] || null,
        unreadCount: unread
      }
    }))

    return NextResponse.json(result)
  } catch (e) {
    console.error('[CHAT_CONVERSATIONS]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
