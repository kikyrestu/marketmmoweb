import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, ctx: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { slug, id } = await ctx.params
  const { status } = await req.json().catch(() => ({})) as { status?: 'ARCHIVED' | 'SOLD' }
  if (!status || !['ARCHIVED', 'SOLD'].includes(status)) {
    return NextResponse.json({ message: 'Invalid status' }, { status: 400 })
  }

  // Validate room
  const room = await (prisma as any).communityRoom.findUnique({ where: { slug }, select: { id: true } })
  if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 })

  // Validate listing ownership
  const listing = await (prisma as any).roomListing.findUnique({ where: { id }, select: { id: true, sellerId: true, itemId: true, roomId: true, status: true } })
  if (!listing || listing.roomId !== room.id) return NextResponse.json({ message: 'Listing not found' }, { status: 404 })
  if (listing.sellerId !== (session.user as any).id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

  // Update status; if SOLD, also mark item unavailable
  const updated = await (prisma as any).$transaction(async (tx: any) => {
    const upd = await tx.roomListing.update({ where: { id }, data: { status } })
    if (status === 'SOLD') {
      await tx.item.update({ where: { id: listing.itemId }, data: { isAvailable: false } })
    }
    return upd
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
}

export async function DELETE(_req: NextRequest, ctx: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { slug, id } = await ctx.params

  const room = await (prisma as any).communityRoom.findUnique({ where: { slug }, select: { id: true } })
  if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 })

  const listing = await (prisma as any).roomListing.findUnique({ where: { id }, select: { id: true, sellerId: true, roomId: true } })
  if (!listing || listing.roomId !== room.id) return NextResponse.json({ message: 'Listing not found' }, { status: 404 })
  if (listing.sellerId !== (session.user as any).id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

  await (prisma as any).roomListing.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
