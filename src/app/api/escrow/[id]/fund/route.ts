import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: any) {
  try {
    const { id } = await ctx.params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const escrow = await (prisma as any).escrowCase.findUnique({ where: { id } })
    if (!escrow) return NextResponse.json({ message: 'Escrow not found' }, { status: 404 })

    // Check if user is the buyer
    if ((escrow.buyerId || (escrow as any).buyer?.id) !== user.id) {
      return NextResponse.json({ message: 'Only buyer can fund escrow' }, { status: 403 })
    }

    // Check if escrow is in PENDING status
    if (escrow.status !== 'PENDING') {
      return NextResponse.json({ message: 'Escrow cannot be funded in current status' }, { status: 400 })
    }

    const body = await req.json()
    const { amount } = body

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ message: 'Invalid amount' }, { status: 400 })
    }

    if (amount > escrow.amount) {
      return NextResponse.json({ message: 'Amount exceeds escrow requirement' }, { status: 400 })
    }

    // Update escrow with funded amount
    const updatedEscrow = await (prisma as any).escrowCase.update({
      where: { id },
      data: {
        fundedAmount: amount,
        status: amount >= escrow.amount ? 'FUNDS_HELD' : 'PARTIALLY_FUNDED'
      }
    })

    // Create audit log
    await (prisma as any).escrowAuditLog.create({
      data: {
        escrowId: escrow.id,
        action: 'FUND',
        actorId: user.id,
        message: `Escrow funded with ${amount} by buyer ${user.name}`
      }
    })

    return NextResponse.json({ escrow: updatedEscrow })
  } catch (e) {
    console.error('[ESCROW_FUND_POST]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
