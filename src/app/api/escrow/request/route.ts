import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notificationHub } from '@/lib/notificationHub'
import { calculateEscrowFee, validateEscrowAmount } from '@/lib/escrow-settings'

export const dynamic = 'force-dynamic'

// POST /api/escrow/request - Create escrow request (doesn't create actual escrow yet)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, itemId } = body;
    if (!conversationId || !itemId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Get conversation and item details
    const conversation = await (prisma as any).conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { include: { user: true } } }
    });

    if (!conversation) {
      return NextResponse.json({ message: 'Conversation not found' }, { status: 404 });
    }

    const item = await (prisma as any).item.findUnique({
      where: { id: itemId },
      include: { seller: true }
    });

    if (!item) {
      return NextResponse.json({ message: 'Item not found' }, { status: 404 });
    }

    // Get current user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Check if user is participant in conversation
    const participant = conversation.participants.find((p: any) => p.userId === currentUser.id);
    if (!participant) {
      return NextResponse.json({ message: 'Not a participant in this conversation' }, { status: 403 });
    }

    // Determine buyer and seller based on participant order (same as meta API)
    // The FIRST participant (index 0) is ALWAYS the BUYER (who initiated chat)
    // The SECOND participant (index 1) is ALWAYS the SELLER
    const currentUserIndex = conversation.participants.findIndex((p: any) => p.userId === currentUser.id);
    const otherParticipant = conversation.participants.find((p: any) => p.userId !== currentUser.id);

    let buyerId: string;
    let sellerId: string;

    if (currentUserIndex === 0) {
      // Current user is first participant = BUYER
      buyerId = currentUser.id;
      sellerId = otherParticipant?.userId || item.sellerId;
    } else if (currentUserIndex === 1) {
      // Current user is second participant = SELLER
      buyerId = otherParticipant?.userId || '';
      sellerId = currentUser.id;
    } else {
      // Fallback
      buyerId = currentUser.id;
      sellerId = item.sellerId;
    }

    // Validate that buyer is not trying to create escrow for their own item
    if (buyerId === sellerId) {
      return NextResponse.json({ message: 'Cannot create escrow for your own item' }, { status: 400 });
    }

    // Additional validation: ensure the seller actually owns the item
    if (sellerId !== item.sellerId) {
      console.log('=== ESCROW VALIDATION WARNING ===');
      console.log('Seller from participants:', sellerId);
      console.log('Item seller:', item.sellerId);
      console.log('This might indicate a data inconsistency');
    }

    // Check if there's already an active escrow request for this conversation
    const existingEscrow = await (prisma as any).escrowCase.findFirst({
      where: {
        conversationId,
        itemId,
        requestStatus: { in: ['PENDING_BUYER_REQUEST', 'PENDING_SELLER_CONFIRMATION', 'ACCEPTED'] },
        status: { notIn: ['REFUNDED', 'RELEASED', 'RESOLVED'] }
      }
    });

    if (existingEscrow) {
      return NextResponse.json({ message: 'Escrow request already exists for this conversation' }, { status: 400 });
    }

    // Validate escrow amount
    const amountValidation = validateEscrowAmount(item.price)
    if (!amountValidation.valid) {
      return NextResponse.json({ message: amountValidation.message }, { status: 400 })
    }

    // Calculate escrow fee
    const { fee, totalAmount } = calculateEscrowFee(item.price)

    // Create escrow request (start with PENDING_SELLER_CONFIRMATION since buyer already requested)
    const escrowRequest = await (prisma as any).escrowCase.create({
      data: {
        conversationId,
        itemId,
        buyerId,
        sellerId,
        totalAmount,
        fee,
        status: 'INIT',
        requestStatus: 'PENDING_SELLER_CONFIRMATION', // Start with seller confirmation
        requestedById: buyerId,
      }
    });

    // Create audit log
    await (prisma as any).escrowAuditLog.create({
      data: {
        escrowId: escrowRequest.id,
        action: 'REQUEST_CREATED',
        createdById: buyerId,
        meta: {
          message: `Escrow request created by buyer ${currentUser.name}`,
          itemId,
          itemName: item.name,
          amount: item.price,
          fee,
          totalAmount
        }
      }
    });

    // Send real-time notification to seller
    try {
      notificationHub.broadcastToUsers([sellerId], () => ({
        type: 'escrow.request',
        conversationId,
        escrow: {
          id: escrowRequest.id,
          buyerId,
          sellerId,
          itemId,
          itemName: item.name,
          amount: item.price,
          fee,
          totalAmount,
          requestedById: buyerId
        }
      }))
    } catch (err) {
      console.error('Escrow real-time notification error', err)
    }

    // Also create database notification for persistence
    const sellerParticipant = conversation.participants.find((p: any) => p.userId === sellerId);
    if (sellerParticipant) {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: sellerId,
          type: 'ESCROW_REQUEST',
          title: 'Rekber Request Baru',
          message: `${currentUser.name} meminta rekber untuk item "${item.name}" seharga Rp ${item.price.toLocaleString()} (fee: Rp ${fee.toLocaleString()}, total: Rp ${totalAmount.toLocaleString()})`,
          data: {
            escrowId: escrowRequest.id,
            conversationId,
            buyerId,
            sellerId,
            itemId,
            itemName: item.name,
            amount: item.price,
            fee,
            totalAmount
          }
        })
      });
    }

    return NextResponse.json({
      escrow: escrowRequest,
      message: 'Escrow request sent to seller'
    });
  } catch (e) {
    console.error('[ESCROW_REQUEST_POST]', e);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
