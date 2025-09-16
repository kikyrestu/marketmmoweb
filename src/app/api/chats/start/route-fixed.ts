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

    console.log(`[CHAT_START] 🔍 Looking for conversation with itemId: ${itemId}`)
    console.log(`[CHAT_START] Current user: ${user.id} (${user.name})`)

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

    if (item.sellerId === user.id) {
      console.log(`[CHAT_START] ❌ Cannot chat with yourself`)
      return NextResponse.json({ message: "Cannot chat with yourself" }, { status: 400 })
    }

    // Find existing conversation for this item with both participants
    // CORRECTED QUERY: Find conversation that has BOTH users as participants
    const existing = await (prisma as any).conversation.findFirst({
      where: {
        itemId: item.id,
        AND: [
          { participants: { some: { userId: user.id } } },
          { participants: { some: { userId: item.sellerId } } }
        ]
      },
      include: {
        participants: {
          select: { userId: true }
        }
      }
    })

    // Additional check: ensure conversation has exactly 2 participants
    if (existing && existing.participants.length === 2) {
      console.log(`[CHAT_START] ✅ FOUND EXISTING conversation ${existing.id} for item ${itemId}`)
      console.log(`[CHAT_START] Participants: ${existing.participants.map((p: any) => p.userId).join(', ')}`)
      return NextResponse.json({ conversationId: existing.id, reused: true })
    }

    // If we found a conversation but it doesn't have exactly 2 participants, log it
    if (existing) {
      console.warn(`[CHAT_START] ⚠️ Found conversation ${existing.id} but it has ${existing.participants.length} participants, expected 2`)
      console.warn(`[CHAT_START] Participants: ${existing.participants.map((p: any) => p.userId).join(', ')}`)
    }

    console.log(`[CHAT_START] 🆕 Creating new conversation for item ${itemId} between user ${user.id} and seller ${item.sellerId}`)

    // Use transaction to ensure atomicity
    const conversation = await (prisma as any).$transaction(async (tx: any) => {
      // Double-check if conversation was created while we were checking
      const doubleCheck = await tx.conversation.findFirst({
        where: {
          itemId: item.id,
          AND: [
            { participants: { some: { userId: user.id } } },
            { participants: { some: { userId: item.sellerId } } }
          ]
        },
        include: {
          participants: {
            select: { userId: true }
          }
        }
      })

      if (doubleCheck && doubleCheck.participants.length === 2) {
        console.log(`[CHAT_START] Conversation ${doubleCheck.id} was created concurrently, reusing it`)
        return doubleCheck
      }

      return await tx.conversation.create({
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
    })

    console.log(`[CHAT_START] Created/reused conversation ${conversation.id}`)
    return NextResponse.json({ conversationId: conversation.id, reused: false })
  } catch (e) {
    console.error('[CHAT_START]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
