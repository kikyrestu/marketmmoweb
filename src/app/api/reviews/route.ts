import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')
    const sellerId = searchParams.get('sellerId')
    const buyerId = searchParams.get('buyerId')
    const transactionId = searchParams.get('transactionId')

    const where: any = {}
    if (itemId) where.itemId = itemId
    if (sellerId) where.sellerId = sellerId
    if (buyerId) where.buyerId = buyerId
    if (transactionId) where.transactionId = transactionId

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        buyer: { select: { id: true, name: true } }
      }
    })

    const summary = await prisma.review.aggregate({
      where,
      _avg: { rating: true },
      _count: { rating: true }
    })

    return NextResponse.json({
      reviews,
      avgRating: summary._avg.rating || 0,
      numReviews: summary._count.rating
    })
  } catch (e) {
    console.error('[REVIEW_GET]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const { transactionId, rating, comment } = await req.json()
    if (!transactionId || !rating) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 })
    }

    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { id: true, buyerId: true, sellerId: true, itemId: true, status: true }
    })
    if (!tx || tx.status !== 'COMPLETED') {
      return NextResponse.json({ message: 'Invalid transaction' }, { status: 400 })
    }
    if (tx.buyerId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const result = await prisma.$transaction(async (p) => {
      const created = await p.review.create({
        data: {
          transactionId,
          rating,
          comment: comment || '',
          itemId: tx.itemId,
          buyerId: tx.buyerId,
          sellerId: tx.sellerId
        }
      })

      const item = await p.item.findUnique({
        where: { id: tx.itemId },
        select: { totalRating: true, numReviews: true }
      })
      const newTotal = (item?.totalRating || 0) + rating
      const newCount = (item?.numReviews || 0) + 1
      await p.item.update({
        where: { id: tx.itemId },
        data: {
          totalRating: newTotal,
          numReviews: newCount,
          avgRating: newTotal / newCount
        }
      })

      return created
    })

    return NextResponse.json(result, { status: 201 })
  } catch (e) {
    console.error('[REVIEW_POST]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
