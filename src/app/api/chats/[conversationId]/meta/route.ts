import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, context: any) {
  try {
  const params = context?.params as { conversationId: string }
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const conversation = await (prisma as any).conversation.findUnique({
      where: { id: params.conversationId },
      select: {
        id: true,
        item: { select: { id: true, name: true, imageUrl: true, price: true } },
        participants: { select: { user: { select: { id: true, name: true } } } }
      }
    })
    if (!conversation) return NextResponse.json({ message: 'Conversation not found' }, { status: 404 })

    const participantIds = conversation.participants.map((p: any) => p.user.id)
    if (!participantIds.includes(user.id)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const other = conversation.participants.find((p: any) => p.user.id !== user.id)

    return NextResponse.json({
      id: conversation.id,
      item: conversation.item,
      otherUser: other?.user || null
    })
  } catch (e) {
    console.error('[CHAT_META_GET]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
