import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/escrow?conversationId=...&itemId=... -> returns latest active escrow
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get('conversationId') || undefined
    const itemId = searchParams.get('itemId') || undefined
    if (!conversationId && !itemId) {
      // Return all escrows if no param
      const escrows = await (prisma as any).escrowCase.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { name: true } },
          seller: { select: { name: true } },
          item: { select: { name: true, price: true } }
        }
      });
      return NextResponse.json({ escrows });
    }
    const escrow = await (prisma as any).escrowCase.findFirst({
      where: {
        ...(conversationId ? { conversationId } : {}),
        ...(itemId ? { itemId } : {}),
        status: { notIn: ['REFUNDED', 'RELEASED', 'RESOLVED'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } }
      }
    })
    if (!escrow) return NextResponse.json({ escrow: null })
    const logs = await (prisma as any).escrowAuditLog.findMany({ where: { escrowId: escrow.id }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ escrow, logs })
  } catch (e) {
    console.error('[ESCROW_INDEX_GET]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// POST /api/escrow
// Body: { conversationId, itemId, buyerId, sellerId, amount }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, itemId, buyerId, sellerId, amount } = body;
    if (!conversationId || !itemId || !buyerId || !sellerId || !amount) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    // Create escrow
    const escrow = await (prisma as any).escrowCase.create({
      data: {
        conversationId,
        itemId,
        buyerId,
        sellerId,
        totalAmount: amount,
        status: 'INIT',
      }
    });
    // Create audit log
    await (prisma as any).escrowAuditLog.create({
      data: {
        escrowId: escrow.id,
        action: 'CREATE',
        createdById: buyerId,
        meta: {
          message: `Escrow created by buyer ${buyerId} for item ${itemId}`,
          amount: amount
        }
      }
    });

    // Notify escrow admins
    const escrowAdmins = await (prisma as any).userRoleAssignment.findMany({
      where: {
        role: 'ADMIN',
        scope: 'ESCROW'
      },
      include: {
        user: true
      }
    });

    if (escrowAdmins.length > 0) {
      const adminIds = escrowAdmins.map((assignment: any) => assignment.userId);

      // Create notifications for all escrow admins
      await Promise.all(adminIds.map((adminId: string) =>
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/notifications/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: adminId,
            type: 'ESCROW_REQUEST',
            title: 'Rekber Request Baru',
            message: `Ada request rekber baru dari buyer untuk item ${itemId}`,
            data: {
              escrowId: escrow.id,
              conversationId: conversationId,
              buyerId,
              sellerId,
              itemId,
              amount: amount
            }
          })
        })
      ));
    }

    // Optionally update item status to unavailable during escrow
    await (prisma as any).item.update({
      where: { id: itemId },
      data: { isAvailable: false }
    });

    return NextResponse.json({ escrow });
  } catch (e) {
    console.error('[ESCROW_INDEX_POST]', e);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
