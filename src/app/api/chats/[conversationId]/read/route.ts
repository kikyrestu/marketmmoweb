import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { chatHub } from '@/lib/chatHub'

// params.conversationId read marker
export async function POST(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const { lastMessageId } = await req.json()

    const { conversationId } = await params

    const participant = await (prisma as any).conversationParticipant.findFirst({
      where: { conversationId: conversationId, userId: user.id }
    })
    if (!participant) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    await (prisma as any).conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadMessageId: lastMessageId || null, lastReadAt: new Date() }
    })

    chatHub.broadcastToUsers([user.id], () => ({
      type: 'read.update',
      conversationId: conversationId,
      unreadCount: 0
    }))

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[CHAT_READ]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}