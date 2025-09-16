import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: any) {
  const { id } = await ctx.params
  const escrow = await (prisma as any).escrowCase.findUnique({ where: { id } })
  if (!escrow) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  const logs = await (prisma as any).escrowAuditLog.findMany({ where: { escrowId: escrow.id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ escrow, logs })
}

export async function DELETE(_req: NextRequest, ctx: any) {
  try {
    const { id } = await ctx.params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const escrow = await (prisma as any).escrowCase.findUnique({
      where: { id },
      include: { buyer: true, seller: true }
    })

    if (!escrow) return NextResponse.json({ message: 'Escrow not found' }, { status: 404 })

    // Only buyer or seller can cancel escrow
    if ((escrow.buyerId || escrow.buyer?.id) !== user.id && (escrow.sellerId || escrow.seller?.id) !== user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // Only allow cancel if escrow is still in INIT status
    if (escrow.status !== 'INIT') {
      return NextResponse.json({ message: 'Cannot cancel escrow in current status' }, { status: 400 })
    }

    // Update escrow status to REFUNDED (cancelled)
    await (prisma as any).escrowCase.update({
      where: { id },
      data: { status: 'REFUNDED' }
    })

    // Create audit log
    await (prisma as any).escrowAuditLog.create({
      data: {
        escrowId: id,
        action: 'REFUND',
        createdById: user.id,
        meta: {
          message: `Escrow cancelled and refunded by ${user.name}`,
          cancelledBy: user.id
        }
      }
    })

    // Make item available again
    await (prisma as any).item.update({
      where: { id: escrow.itemId },
      data: { isAvailable: true }
    })

    return NextResponse.json({ message: 'Escrow cancelled successfully' })
  } catch (e) {
    console.error('[ESCROW_DELETE]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
