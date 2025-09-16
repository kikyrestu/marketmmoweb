import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notificationHub } from '@/lib/notificationHub'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { userId, type, title, message, data } = await req.json()

    if (!userId || !type || !title || !message) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || {}
      }
    })

    // Send real-time notification
    notificationHub.broadcastToUsers([userId], () => ({
      type: 'notification.new',
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt.toISOString()
      }
    }))

    return NextResponse.json({ id: notification.id }, { status: 201 })
  } catch (error) {
    console.error('[NOTIFICATION_CREATE]', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
