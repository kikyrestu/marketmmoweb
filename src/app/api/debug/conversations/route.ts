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

    // Get all conversations for this user
    const conversations = await (prisma as any).conversation.findMany({
      where: {
        participants: {
          some: {
            userId: user.id
          }
        }
      },
      include: {
        item: true,
        participants: {
          include: {
            user: true
          }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    })

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      conversations: conversations.map((c: any) => ({
        id: c.id,
        itemId: c.itemId,
        item: c.item,
        participants: c.participants.map((p: any) => ({
          userId: p.userId,
          userName: p.user.name
        }))
      }))
    })
  } catch (e) {
    console.error('[DEBUG_CONVERSATIONS]', e)
    return NextResponse.json({ message: 'Internal error', error: (e as Error).message }, { status: 500 })
  }
}
