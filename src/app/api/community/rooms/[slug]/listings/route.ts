import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, ctx: any) {
  const { slug } = await ctx.params
  const room = await prisma.communityRoom.findUnique({ where: { slug }, select: { id: true, isTradable: true } })
  if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 })
  const listings = await prisma.roomListing.findMany({
    where: { roomId: room.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, sellerId: true, createdAt: true, item: { select: { id: true, name: true, price: true, imageUrl: true, seller: { select: { id: true, name: true } } } } }
  })
  return NextResponse.json({ listings })
}

export async function POST(req: NextRequest, ctx: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  const { slug } = await ctx.params
  const { itemId } = await req.json()
  if (!itemId) return NextResponse.json({ message: 'itemId required' }, { status: 400 })
  const room = await prisma.communityRoom.findUnique({ where: { slug }, select: { id: true, isTradable: true } })
  if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 })
  if (!room.isTradable) return NextResponse.json({ message: 'Room is not tradable' }, { status: 400 })
  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { id: true, sellerId: true, isAvailable: true } })
  if (!item || !item.isAvailable) return NextResponse.json({ message: 'Item unavailable' }, { status: 400 })
  if (item.sellerId !== session.user.id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  const listing = await prisma.roomListing.create({ data: { roomId: room.id, itemId: item.id, sellerId: session.user.id } })
  return NextResponse.json({ id: listing.id }, { status: 201 })
}

export async function PATCH(req: NextRequest, ctx: any) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const { slug } = await ctx.params
    const { id, status } = await req.json()
    if (!id || !status) return NextResponse.json({ message: 'id and status required' }, { status: 400 })
    if (!['ACTIVE', 'ARCHIVED', 'SOLD'].includes(status)) return NextResponse.json({ message: 'Invalid status' }, { status: 400 })

    const room = await prisma.communityRoom.findUnique({ where: { slug }, select: { id: true } })
    if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 })

    const listing = await prisma.roomListing.findUnique({ where: { id }, select: { id: true, roomId: true, sellerId: true } })
    if (!listing || listing.roomId !== room.id) return NextResponse.json({ message: 'Listing not found' }, { status: 404 })
    if (listing.sellerId !== session.user.id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    await prisma.roomListing.update({ where: { id }, data: { status } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[LISTING_PATCH]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, ctx: any) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const { slug } = await ctx.params
    const { id } = await req.json()
    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 })

    const room = await prisma.communityRoom.findUnique({ where: { slug }, select: { id: true } })
    if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 })

    const listing = await prisma.roomListing.findUnique({ where: { id }, select: { id: true, roomId: true, sellerId: true } })
    if (!listing || listing.roomId !== room.id) return NextResponse.json({ message: 'Listing not found' }, { status: 404 })
    if (listing.sellerId !== session.user.id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    await prisma.roomListing.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[LISTING_DELETE]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
