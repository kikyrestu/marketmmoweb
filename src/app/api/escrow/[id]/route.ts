import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: any) {
  const { id } = await ctx.params
  const escrow = await (prisma as any).escrowCase.findUnique({ where: { id } })
  if (!escrow) return NextResponse.json({ message: 'Not found' }, { status: 404 })
  const logs = await (prisma as any).escrowAuditLog.findMany({ where: { escrowId: escrow.id }, orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ escrow, logs })
}
