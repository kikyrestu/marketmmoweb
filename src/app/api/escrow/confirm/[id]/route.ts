import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notificationHub } from '@/lib/notificationHub';

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const escrowId = (await params).id;

    // Get escrow with item and participants
    const escrow = await (prisma as any).escrowCase.findUnique({
      where: { id: escrowId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        conversationId: true,
        requestStatus: true,
        status: true,
        item: {
          select: {
            seller: true,
          },
        },
        buyer: true,
        seller: true,
      },
    });

    if (!escrow) {
      return NextResponse.json({ error: 'Escrow not found' }, { status: 404 });
    }

    // Check if user is the buyer
    if (((escrow as any).buyerId || (escrow as any).buyer?.id) !== session.user.id) {
      return NextResponse.json({ error: 'Only buyer can confirm escrow' }, { status: 403 });
    }

    // Check if escrow is in correct status (seller accepted)
    if ((escrow as any).requestStatus !== 'ACCEPTED') {
      return NextResponse.json({ error: 'Escrow must be accepted by seller before buyer confirmation' }, { status: 400 });
    }

    // Buyer confirms - move to pending seller final confirmation
    await (prisma as any).escrowCase.update({
      where: { id: escrowId },
      data: {
        requestStatus: 'PENDING_SELLER_CONFIRMATION',
        auditLogs: {
          create: {
            action: 'buyer_confirmed',
            createdById: session.user.id,
          },
        },
      },
    });

    // Send real-time notification to seller for final confirmation
    try {
      const conversationId = (escrow as any).conversationId || escrowId;
      notificationHub.broadcastToUsers([escrow.sellerId], () => ({
        type: 'escrow.final_confirm',
        conversationId: conversationId,
        escrow: {
          id: escrowId,
          buyerId: escrow.buyerId,
          sellerId: escrow.sellerId,
          confirmedById: session.user.id
        }
      }))
    } catch (err) {
      console.error('Escrow buyer confirm real-time notification error', err)
    }

    return NextResponse.json({ message: 'Escrow confirmed by buyer, waiting for seller final confirmation' });
  } catch (error) {
    console.error('Error confirming escrow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
