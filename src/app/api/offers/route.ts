import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notificationHub } from '@/lib/notificationHub'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const convoId = req.nextUrl.searchParams.get('conversationId')
  if (!convoId) return NextResponse.json({ message: 'conversationId required' }, { status: 400 })
  const offers = await (prisma as any).offer.findMany({
    where: { conversationId: convoId },
    orderBy: { createdAt: 'asc' }
  })
  return NextResponse.json(offers)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const { conversationId, itemId, amount, note } = await req.json()
    if (!conversationId || !itemId || !amount) return NextResponse.json({ message: 'Missing fields' }, { status: 400 })
    const convo = await (prisma as any).conversation.findUnique({ where: { id: conversationId }, include: { participants: true, item: { select: { sellerId: true } } } })
    if (!convo) return NextResponse.json({ message: 'Conversation not found' }, { status: 404 })
    const userId = session.user.id
    const isParticipant = convo.participants.some((p: any) => p.userId === userId)
    if (!isParticipant) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    const sellerId = convo.item.sellerId
    const buyerId = userId === sellerId ? convo.participants.find((p: any) => p.userId !== sellerId)?.userId : userId
    if (!buyerId) return NextResponse.json({ message: 'Invalid participants' }, { status: 400 })
    const created = await (prisma as any).offer.create({
      data: {
        conversationId,
        itemId,
        buyerId,
        sellerId,
        createdById: userId,
        amount: Math.max(0, Math.floor(amount)),
        note: note || null,
        status: 'SENT'
      }
    })
    try {
      const ids = convo.participants.map((p: any) => p.userId).filter((id: string) => id !== userId)
      notificationHub.broadcastToUsers(ids, () => ({
        type: 'offer.new',
        conversationId,
        offer: { id: created.id, amount: created.amount, createdById: created.createdById }
      }))
    } catch (err) { console.error('Offer notification error', err) }
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    console.error('[OFFER_POST]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
