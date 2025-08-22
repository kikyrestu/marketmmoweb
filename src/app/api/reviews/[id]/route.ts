import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: any) {
  try {
    const review = await prisma.review.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        buyer: { select: { id: true, name: true } },
        sellerId: true,
        itemId: true,
        transactionId: true
      }
    })
    if (!review) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(review)
  } catch (e) {
    console.error('[REVIEW_ID_GET]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const { rating, comment } = await req.json()
    if (!rating && !comment) return NextResponse.json({ message: 'Nothing to update' }, { status: 400 })
    const result = await prisma.$transaction(async (p) => {
      const existing = await p.review.findUnique({ where: { id: params.id } })
      if (!existing) return null
      if (existing.buyerId !== session.user.id) throw new Error('FORBIDDEN')

      const updated = await p.review.update({
        where: { id: params.id },
        data: { rating: rating ?? existing.rating, comment: comment ?? existing.comment }
      })

      const item = await p.item.findUnique({
        where: { id: existing.itemId },
        select: { totalRating: true, numReviews: true }
      })
      const newTotal = (item?.totalRating || 0) - existing.rating + (rating ?? existing.rating)
      const newCount = item?.numReviews || 0
      await p.item.update({
        where: { id: existing.itemId },
        data: {
          totalRating: newTotal,
          numReviews: newCount,
          avgRating: newCount ? newTotal / newCount : 0
        }
      })

      return updated
    })
    if (!result) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(result)
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
    console.error('[REVIEW_PATCH]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const result = await prisma.$transaction(async (p) => {
      const existing = await p.review.findUnique({ where: { id: params.id } })
      if (!existing) return null
      if (existing.buyerId !== session.user.id) throw new Error('FORBIDDEN')

      await p.review.delete({ where: { id: params.id } })
      const item = await p.item.findUnique({
        where: { id: existing.itemId },
        select: { totalRating: true, numReviews: true }
      })
      const newTotal = (item?.totalRating || 0) - existing.rating
      const newCount = (item?.numReviews || 0) - 1
      await p.item.update({
        where: { id: existing.itemId },
        data: {
          totalRating: newTotal,
          numReviews: newCount,
          avgRating: newCount > 0 ? newTotal / newCount : 0
        }
      })
      return existing
    })
    if (!result) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }
    console.error('[REVIEW_DELETE]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
