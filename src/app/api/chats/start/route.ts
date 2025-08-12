import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Start or reuse a conversation: body { itemId: string }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { itemId } = await req.json()
    if (!itemId) {
      return NextResponse.json({ message: "itemId required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 })

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, sellerId: true }
    })
    if (!item) return NextResponse.json({ message: "Item not found" }, { status: 404 })

    if (item.sellerId === user.id) {
      return NextResponse.json({ message: "Cannot chat with yourself" }, { status: 400 })
    }

    // Find existing conversation for this item with both participants
  // Using Conversation model
  const existing = await (prisma as any).conversation.findFirst({
      where: {
        itemId: item.id,
        participants: {
          every: {
            userId: { in: [user.id, item.sellerId] }
          }
        }
      },
      select: { id: true }
    })

    if (existing) {
      return NextResponse.json({ conversationId: existing.id, reused: true })
    }

  const conversation = await (prisma as any).conversation.create({
      data: {
        item: { connect: { id: item.id } },
        participants: {
          create: [
            { user: { connect: { id: user.id } } },
            { user: { connect: { id: item.sellerId } } }
          ]
        }
      },
      select: { id: true }
    })

    return NextResponse.json({ conversationId: conversation.id, reused: false })
  } catch (e) {
    console.error('[CHAT_START]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
