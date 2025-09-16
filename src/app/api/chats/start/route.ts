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

    const { itemId, forceNew } = await req.json()
    if (!itemId) {
      return NextResponse.json({ message: "itemId required" }, { status: 400 })
    }

    console.log(`[CHAT_START] 🔍 Looking for conversation with itemId: ${itemId}`)

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 })

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, sellerId: true, name: true }
    })
    if (!item) {
      console.log(`[CHAT_START] ❌ Item not found: ${itemId}`)
      return NextResponse.json({ message: "Item not found" }, { status: 404 })
    }

    console.log(`[CHAT_START] 📦 Found item: ${item.name} (ID: ${item.id})`)
    console.log(`[CHAT_START] 👤 Item seller: ${item.sellerId}`)
    console.log(`[CHAT_START] 👤 Current user: ${user.id} (${user.name})`)

    if (item.sellerId === user.id) {
      console.log(`[CHAT_START] ❌ Cannot chat with yourself`)
      return NextResponse.json({ message: "Cannot chat with yourself" }, { status: 400 })
    }

    // Check if user already has a conversation with this seller for this item
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        itemId: item.id,
        participants: {
          some: { userId: user.id }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    // If conversation exists with exactly 2 participants (buyer + seller), show warning
    // But skip warning if forceNew is true
    if (!forceNew && existingConversation && existingConversation.participants.length === 2) {
      const otherParticipant = existingConversation.participants.find(p => p.userId !== user.id)
      console.log(`[CHAT_START] ⚠️ EXISTING conversation found: ${existingConversation.id}`)
      console.log(`[CHAT_START] Other participant: ${otherParticipant?.user.name} (${otherParticipant?.userId})`)

      return NextResponse.json({
        conversationId: existingConversation.id,
        warning: true,
        message: `Kamu sudah memiliki percakapan pembelian dengan ${otherParticipant?.user.name} untuk item ini. Selesaikan transaksi dulu atau buat percakapan baru?`,
        sellerName: otherParticipant?.user.name,
        existingConversationId: existingConversation.id
      })
    }

    console.log(`[CHAT_START] 🆕 ${forceNew ? 'Force creating' : 'No existing conversation found, creating'} new one for item ${itemId}`)
    console.log(`[CHAT_START] Between: ${user.name} (${user.id}) and seller (${item.sellerId})`)

    // Create new conversation using transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Double-check if conversation was created while we were checking
      const doubleCheck = await tx.conversation.findFirst({
        where: {
          itemId: item.id,
          participants: {
            every: {
              userId: {
                in: [user.id, item.sellerId]
              }
            }
          }
        },
        include: {
          participants: true
        }
      })

      if (doubleCheck && doubleCheck.participants.length === 2) {
        console.log(`[CHAT_START] Conversation ${doubleCheck.id} was created concurrently, reusing it`)
        return doubleCheck
      }

      // Create new conversation
      const newConversation = await tx.conversation.create({
        data: {
          itemId: item.id,
          participants: {
            create: [
              { userId: user.id },
              { userId: item.sellerId }
            ]
          }
        }
      })

      console.log(`[CHAT_START] Created new conversation ${newConversation.id}`)
      return newConversation
    })

    return NextResponse.json({
      conversationId: result.id,
      warning: false,
      message: "Percakapan baru berhasil dibuat"
    })
  } catch (e) {
    console.error('[CHAT_START] Error:', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
