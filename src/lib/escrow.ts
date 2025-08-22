import { prisma } from '@/lib/prisma'

type EnsureResult = {
  escrowId: string
  created: boolean
}

// Create or reuse an escrow for an accepted offer, plus audit logs.
// Safe to call multiple times; it will reuse existing active escrow.
export async function ensureEscrowForAcceptedOffer(offerId: string, actorUserId: string): Promise<EnsureResult | null> {
  try {
    const offer = await (prisma as any).offer.findUnique({
      where: { id: offerId },
      select: { id: true, status: true, amount: true, conversationId: true, itemId: true, buyerId: true, sellerId: true }
    })
    if (!offer) return null
    if (offer.status !== 'ACCEPTED') return null

    // Try reuse an active escrow for the same convo+item+pair
    const existing = await (prisma as any).escrowCase.findFirst({
      where: {
        conversationId: offer.conversationId,
        itemId: offer.itemId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        // consider active states
        NOT: { status: { in: ['RELEASED', 'REFUNDED', 'RESOLVED'] } }
      },
      select: { id: true }
    })

    if (existing) {
      // Log reuse
      await (prisma as any).escrowAuditLog.create({
        data: {
          escrowId: existing.id,
          action: 'ESCROW_REUSED',
          meta: { offerId: offer.id, note: 'Offer accepted reused existing active escrow' },
          createdById: actorUserId
        }
      })
      return { escrowId: existing.id, created: false }
    }

    // Create new escrow
    const escrow = await (prisma as any).escrowCase.create({
      data: {
        conversationId: offer.conversationId,
        itemId: offer.itemId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        // Business rules for fee can be added later; keep 0 for now
        fee: 0,
        totalAmount: Math.max(0, Number(offer.amount || 0)),
      }
    })

    // Participants (BUYER, SELLER)
    await (prisma as any).escrowParticipant.createMany({
      data: [
        { escrowId: escrow.id, userId: offer.buyerId, role: 'BUYER' },
        { escrowId: escrow.id, userId: offer.sellerId, role: 'SELLER' },
      ],
      skipDuplicates: true,
    })

    // Audit logs
    await (prisma as any).escrowAuditLog.create({
      data: {
        escrowId: escrow.id,
        action: 'ESCROW_CREATED',
        meta: { offerId: offer.id, amount: offer.amount },
        createdById: actorUserId,
      }
    })

    return { escrowId: escrow.id, created: true }
  } catch (e) {
    console.error('[ESCROW_HELPER.ensureEscrowForAcceptedOffer]', e)
    return null
  }
}
