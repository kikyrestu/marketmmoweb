import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notificationHub } from '@/lib/notificationHub';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();
    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const escrowId = (await params).id;

    // Get escrow with item and participants
    const escrow = await prisma.escrowCase.findUnique({
      where: { id: escrowId },
      include: {
        item: {
          include: {
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

    // Check if user is the seller (use escrow.sellerId, not item.sellerId)
    if ((escrow.sellerId || (escrow as any).seller?.id) !== session.user.id) {
      return NextResponse.json({ error: 'Only seller can respond to escrow request' }, { status: 403 });
    }

    // Check if escrow is in correct status
    if ((escrow as any).requestStatus !== 'PENDING_SELLER_CONFIRMATION') {
      return NextResponse.json({ error: 'Escrow is not in pending seller confirmation status' }, { status: 400 });
    }

    if (action === 'accept') {
      // Seller accepts - move to pending buyer confirmation
      await (prisma as any).escrowCase.update({
        where: { id: escrowId },
        data: {
          requestStatus: 'ACCEPTED',
          auditLogs: {
            create: {
              action: 'seller_accepted',
              createdById: session.user.id,
            },
          },
        },
      });

      // Send real-time notification to buyer
      try {
        notificationHub.broadcastToUsers([escrow.buyerId], () => ({
          type: 'escrow.response',
          conversationId: escrow.conversationId,
          escrow: {
            id: escrowId,
            buyerId: escrow.buyerId,
            sellerId: escrow.sellerId,
            action: 'accept',
            respondedById: session.user.id
          }
        }))
      } catch (err) {
        console.error('Escrow response real-time notification error', err)
      }

      return NextResponse.json({ message: 'Escrow request accepted by seller' });
    } else {
      // Seller rejects - cancel escrow
      await (prisma as any).escrowCase.update({
        where: { id: escrowId },
        data: {
          requestStatus: 'REJECTED',
          auditLogs: {
            create: {
              action: 'seller_rejected',
              createdById: session.user.id,
            },
          },
        },
      });

      // Send real-time notification to buyer
      try {
        notificationHub.broadcastToUsers([escrow.buyerId], () => ({
          type: 'escrow.response',
          conversationId: escrow.conversationId,
          escrow: {
            id: escrowId,
            buyerId: escrow.buyerId,
            sellerId: escrow.sellerId,
            action: 'reject',
            respondedById: session.user.id
          }
        }))
      } catch (err) {
        console.error('Escrow response real-time notification error', err)
      }

      return NextResponse.json({ message: 'Escrow request rejected by seller' });
    }
  } catch (error) {
    console.error('Error responding to escrow request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
