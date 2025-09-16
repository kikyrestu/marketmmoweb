import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
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

    const { notificationId } = await req.json()

    if (notificationId) {
      // Mark specific notification as read
      await prisma.notification.update({
        where: {
          id: notificationId,
          userId: user.id
        },
        data: {
          status: 'READ',
          readAt: new Date()
        }
      })
    } else {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          status: 'UNREAD'
        },
        data: {
          status: 'READ',
          readAt: new Date()
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[NOTIFICATION_MARK_READ]', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
