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

    const { friendId } = await req.json()

    if (!friendId) {
      return NextResponse.json({ message: 'Friend ID is required' }, { status: 400 })
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Check if already friends or request exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: currentUser.id, addresseeId: friendId },
          { requesterId: friendId, addresseeId: currentUser.id }
        ]
      }
    })

    if (existingFriendship) {
      return NextResponse.json({ message: 'Friend request already exists or you are already friends' }, { status: 400 })
    }

    // Create friend request
    const friendship = await prisma.friendship.create({
      data: {
        requesterId: currentUser.id,
        addresseeId: friendId,
        status: 'PENDING'
      }
    })

    // Send notification to the recipient
    try {
      const requester = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { name: true }
      });

      if (requester) {
        const { notifyFriendRequest } = await import('@/lib/notification-helpers');
        await notifyFriendRequest(friendId, requester.name, currentUser.id);
      }
    } catch (error) {
      console.error('Failed to send friend request notification:', error);
      // Don't fail the friend request if notification fails
    }

    return NextResponse.json({
      message: 'Friend request sent successfully',
      friendshipId: friendship.id
    })
  } catch (error) {
    console.error('[FRIEND_REQUEST_POST]', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
