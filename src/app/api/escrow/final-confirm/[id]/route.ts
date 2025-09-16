import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notificationHub } from '@/lib/notificationHub';

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const escrowId = (await params).id;
    const userId = session.user.id;

    // Get the escrow case
    const escrowCase = await (prisma as any).escrowCase.findUnique({
      where: { id: escrowId },
      include: {
        item: true,
        buyer: true,
        seller: true,
      },
    });

    if (!escrowCase) {
      return NextResponse.json({ error: 'Escrow case not found' }, { status: 404 });
    }

    // Check if user is the seller
    if (escrowCase.sellerId !== userId) {
      return NextResponse.json({ error: 'Only seller can perform final confirmation' }, { status: 403 });
    }

    // Check if escrow is in PENDING_SELLER_CONFIRMATION status
    if (escrowCase.status !== 'PENDING_SELLER_CONFIRMATION') {
      return NextResponse.json({ error: 'Escrow is not in pending seller confirmation status' }, { status: 400 });
    }

    // Start transaction
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // Update escrow status to FUNDS_HELD
      const updatedEscrow = await tx.escrowCase.update({
        where: { id: escrowId },
        data: {
          status: 'FUNDS_HELD',
          updatedAt: new Date(),
        },
      });

      // Create escrow participants if they don't exist
      const participants = [
        { escrowId, userId: escrowCase.buyerId, role: 'BUYER' },
        { escrowId, userId: escrowCase.sellerId, role: 'SELLER' },
      ];

      for (const participant of participants) {
        await tx.escrowParticipant.upsert({
          where: {
            escrowId_userId: {
              escrowId: participant.escrowId,
              userId: participant.userId,
            },
          },
          update: {},
          create: {
            ...participant,
            joinedAt: new Date(),
          },
        });
      }

      // Create audit log
      await tx.escrowAuditLog.create({
        data: {
          escrowId,
          action: 'SELLER_FINAL_CONFIRMATION',
          createdById: userId,
        },
      });

      return updatedEscrow;
    });

    // Send real-time notification
    try {
      const conversationId = escrowCase.conversationId || escrowId;
      notificationHub.broadcastToUsers([escrowCase.buyerId], () => ({
        type: 'escrow.final_confirm',
        conversationId: conversationId,
        escrow: {
          id: escrowId,
          buyerId: escrowCase.buyerId,
          sellerId: escrowCase.sellerId,
          confirmedById: userId
        }
      }))
    } catch (err) {
      console.error('Escrow seller final confirm real-time notification error', err)
    }

    return NextResponse.json({
      success: true,
      escrow: result,
      message: 'Escrow confirmed successfully by seller',
    });

  } catch (error) {
    console.error('Error in seller final confirmation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
