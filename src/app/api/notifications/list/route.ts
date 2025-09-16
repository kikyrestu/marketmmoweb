import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'UNREAD'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.id,
        status: status as any
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    const total = await prisma.notification.count({
      where: {
        userId: user.id,
        status: status as any
      }
    })

    return NextResponse.json({
      notifications,
      total,
      hasMore: offset + limit < total
    })
  } catch (error) {
    console.error('[NOTIFICATIONS_LIST]', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
