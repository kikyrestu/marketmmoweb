import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isEscrowAdmin } from '@/lib/rbac'

// POST /api/conversations/[conversationId]/join-admin
// Admin join conversation for escrow
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 })

    // Check if user is escrow admin
    if (!(await isEscrowAdmin(user.id, user.role as any))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const { conversationId } = await params

    // Check if conversation exists
    const conversation = await (prisma as any).conversation.findUnique({
      where: { id: conversationId }
    })
    if (!conversation) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 })
    }

    // Check if admin is already a participant
    const existingParticipant = await (prisma as any).conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id
        }
      }
    })

    if (existingParticipant) {
      return NextResponse.json({ message: "Admin already in conversation" })
    }

    // Add admin as participant
    const participant = await (prisma as any).conversationParticipant.create({
      data: {
        conversationId,
        userId: user.id
      }
    })

    // Create system message that admin joined
    await (prisma as any).chatMessage.create({
      data: {
        conversationId,
        senderId: user.id,
        body: `🔧 Admin ${user.name} telah bergabung untuk memfasilitasi rekber`
      }
    })

    return NextResponse.json({ participant })
  } catch (e) {
    console.error('[CONVERSATION_JOIN_ADMIN]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
