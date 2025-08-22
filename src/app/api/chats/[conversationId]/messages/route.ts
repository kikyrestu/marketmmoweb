import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { chatHub } from '@/lib/chatHub'

// params.conversationId represents conversation id
export async function GET(_req: Request, context: any) {
  try {
  const params = context?.params as { conversationId: string }
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const { searchParams } = new URL(_req.url)
    const cursor = searchParams.get('cursor')
    const limit = Number(searchParams.get('limit') || 30)

    const participant = await (prisma as any).conversationParticipant.findFirst({
      where: { conversationId: params.conversationId, userId: user.id },
      select: { id: true }
    })
    if (!participant) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const messages = await (prisma as any).chatMessage.findMany({
      where: { conversationId: params.conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, body: true, createdAt: true, senderId: true }
    })

  const hasMore = messages.length > limit
    const sliced = hasMore ? messages.slice(0, -1) : messages

    return NextResponse.json({ messages: sliced.reverse(), nextCursor: hasMore ? sliced[0].id : null })
  } catch (e) {
    console.error('[CHAT_MESSAGES_GET]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request, context: any) {
  try {
  const params = context?.params as { conversationId: string }
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const { body } = await req.json()
    if (!body || !body.trim()) return NextResponse.json({ message: 'Empty body' }, { status: 400 })
    if (body.length > 65535) return NextResponse.json({ message: 'Message too long' }, { status: 413 })

    const participant = await (prisma as any).conversationParticipant.findFirst({
      where: { conversationId: params.conversationId, userId: user.id },
      select: { id: true }
    })
    if (!participant) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const message = await (prisma as any).chatMessage.create({
      data: {
        conversation: { connect: { id: params.conversationId } },
        sender: { connect: { id: user.id } },
        body: body.trim()
      },
      select: { id: true, body: true, createdAt: true, senderId: true }
    })

    await (prisma as any).conversation.update({
      where: { id: params.conversationId },
      data: { lastMessageAt: new Date() }
    })

    try {
      const participants = await (prisma as any).conversationParticipant.findMany({
        where: { conversationId: params.conversationId },
        select: { userId: true }
      })
      const ids = participants.map((p: any) => p.userId)
      chatHub.broadcastToUsers(ids, (uid) => ({
        type: 'conversation.update',
        conversationId: params.conversationId,
        lastMessage: { id: message.id, body: message.body, createdAt: message.createdAt.toISOString(), senderId: message.senderId },
        unreadCount: uid === message.senderId ? 0 : 1
      }))
      chatHub.broadcastToUsers(ids, () => ({
        type: 'message.new',
        conversationId: params.conversationId,
        message: { id: message.id, body: message.body, createdAt: message.createdAt.toISOString(), senderId: message.senderId }
      }))
    } catch (err) { console.error('Broadcast error', err) }

    return NextResponse.json(message)
  } catch (e) {
    console.error('[CHAT_MESSAGES_POST]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}