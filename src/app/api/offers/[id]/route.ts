import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureEscrowForAcceptedOffer } from '@/lib/escrow'

export const dynamic = 'force-dynamic'

async function updateStatus(id: string, userId: string, status: 'ACCEPTED'|'REJECTED'|'COUNTER', amount?: number, note?: string) {
  const offer = await (prisma as any).offer.findUnique({ where: { id }, include: { conversation: { include: { participants: true } } } })
  if (!offer) return { status: 404 as const, body: { message: 'Not found' } }
  const isParticipant = offer.conversation.participants.some((p: any) => p.userId === userId)
  if (!isParticipant) return { status: 403 as const, body: { message: 'Forbidden' } }

  if (status === 'COUNTER') {
    if (!amount) return { status: 400 as const, body: { message: 'amount required' } }
    const counter = await (prisma as any).offer.create({
      data: {
        conversationId: offer.conversationId,
        itemId: offer.itemId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        createdById: userId,
        amount: Math.max(0, Math.floor(amount)),
        note: note || null,
        status: 'COUNTER'
      }
    })
    return { status: 200 as const, body: counter }
  }

  const updated = await (prisma as any).offer.update({ where: { id }, data: { status } })
  if (updated.status === 'ACCEPTED') {
    // Best-effort ensure escrow exists
    try { await ensureEscrowForAcceptedOffer(updated.id, userId) } catch {}
  }
  return { status: 200 as const, body: updated }
}

export async function PATCH(req: NextRequest, { params }: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const { status, amount, note } = await req.json()
    if (!['ACCEPTED','REJECTED','COUNTER'].includes((status||'').toUpperCase())) return NextResponse.json({ message: 'Invalid status' }, { status: 400 })
    const result = await updateStatus(params.id, session.user.id, (status as any).toUpperCase(), amount, note)
    return NextResponse.json(result.body, { status: result.status })
  } catch (e) {
    console.error('[OFFER_PATCH]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
