import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        bio: true,
        role: true,
        createdAt: true,
        isVerified: true,
        verificationStatus: true,
        // Get user stats
        _count: {
          select: {
            items: true,
            soldItems: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Format response
    const userInfo = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      stats: {
        totalItems: user._count.items,
        totalSales: user._count.soldItems,
      },
      // badges: user.badges || [], // Uncomment if you have badges
    }

    return NextResponse.json(userInfo)
  } catch (error) {
    console.error('[USER_INFO_GET]', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
