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
      return NextResponse.json({ message: 'Missing conversationId or itemId' }, { status: 400 })
    }
    const escrow = await (prisma as any).escrowCase.findFirst({
      where: {
        ...(conversationId ? { conversationId } : {}),
        ...(itemId ? { itemId } : {}),
      },
      orderBy: { createdAt: 'desc' }
    })
    if (!escrow) return NextResponse.json({ escrow: null })
    const logs = await (prisma as any).escrowAuditLog.findMany({ where: { escrowId: escrow.id }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ escrow, logs })
  } catch (e) {
    console.error('[ESCROW_INDEX_GET]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
