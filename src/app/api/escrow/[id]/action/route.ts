import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { awardLoyalty } from '@/lib/loyalty'
import { isEscrowAdmin } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, ctx: any) {
  const { id } = await ctx.params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  if (!(await isEscrowAdmin(session.user.id, (session.user as any).role))) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }
  const form = await req.formData()
  const action = String(form.get('action') || '')
  const escrow = await (prisma as any).escrowCase.findUnique({ where: { id } })
  if (!escrow) return NextResponse.json({ message: 'Not found' }, { status: 404 })

  let newStatus = escrow.status
  switch (action) {
    case 'HOLD': newStatus = 'FUNDS_HELD'; break
    case 'RELEASE': newStatus = 'RELEASED'; break
    case 'REFUND': newStatus = 'REFUNDED'; break
    case 'DISPUTE': newStatus = 'DISPUTE'; break
    case 'RESOLVE': newStatus = 'RESOLVED'; break
    default: return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
  }

  await (prisma as any).escrowCase.update({ where: { id: escrow.id }, data: { status: newStatus } })
  await (prisma as any).escrowAuditLog.create({ data: { escrowId: escrow.id, action, createdById: session.user.id } })

  // Loyalty: award points to buyer when resolved
  if (newStatus === 'RESOLVED') {
    try {
      const fresh = await (prisma as any).escrowCase.findUnique({ where: { id: escrow.id } })
      if (fresh && (fresh.buyerId || fresh.buyer?.id) && typeof fresh.totalAmount === 'number') {
        const points = Math.max(0, Math.floor(fresh.totalAmount / 1000)) // 1 point per 1k amount
        await awardLoyalty({ userId: fresh.buyerId || fresh.buyer?.id, points, reason: 'ESCROW_RESOLVED', refType: 'EscrowCase', refId: fresh.id })
      }
    } catch (e) {
      console.error('[LOYALTY_ESCROW_RESOLVED]', e)
    }
  }
  return NextResponse.redirect(new URL(`/admin/escrow/${escrow.id}`, req.url))
}
