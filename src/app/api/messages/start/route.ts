import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Start a direct message conversation: body { recipientId: string, itemId?: string }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { recipientId, itemId } = await req.json()
    if (!recipientId) {
      return NextResponse.json({ message: "recipientId required" }, { status: 400 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true }
    })
    if (!recipient) {
      return NextResponse.json({ message: "Recipient not found" }, { status: 404 })
    }

    if (recipientId === currentUser.id) {
      return NextResponse.json({ message: "Cannot message yourself" }, { status: 400 })
    }

    let conversationItemId: string

    if (itemId) {
      // Use the provided item for the conversation
      const item = await prisma.item.findUnique({
        where: { id: itemId },
        select: { id: true, sellerId: true }
      })
      if (!item) {
        return NextResponse.json({ message: "Item not found" }, { status: 404 })
      }
      conversationItemId = itemId
    } else {
      // For direct messages without item context, create/use a placeholder item
      let directMessageItem = await prisma.item.findFirst({
        where: {
          name: "Direct Message",
          sellerId: currentUser.id
        }
      })

      if (!directMessageItem) {
        // Get or create a default category for direct messages
        let defaultCategory = await prisma.category.findFirst()
        if (!defaultCategory) {
          defaultCategory = await prisma.category.create({
            data: {
              name: "General",
              description: "General category for items"
            }
          })
        }

        // Create the placeholder item if it doesn't exist
        directMessageItem = await prisma.item.create({
          data: {
            name: "Direct Message",
            description: "Placeholder item for direct messages",
            price: 0,
            sellerId: currentUser.id,
            categoryId: defaultCategory.id,
            isAvailable: false // Make it unavailable so it doesn't show in listings
          }
        })
      }
      conversationItemId = directMessageItem.id
    }

    // Check if a conversation already exists
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        itemId: conversationItemId,
        participants: {
          every: {
            userId: { in: [currentUser.id, recipientId] }
          }
        }
      },
      select: { id: true }
    })

    if (existingConversation) {
      return NextResponse.json({
        conversationId: existingConversation.id,
        reused: true
      })
    }

    // Create a new conversation
    const conversation = await prisma.conversation.create({
      data: {
        itemId: conversationItemId,
        participants: {
          create: [
            { userId: currentUser.id },
            { userId: recipientId }
          ]
        }
      },
      select: { id: true }
    })

    return NextResponse.json({
      conversationId: conversation.id,
      created: true
    })
  } catch (error) {
    console.error('[DIRECT_MESSAGE_START]', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
