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

    // Cari conversation yang mengandung BOTH current user & seller untuk item ini, walau ada participant tambahan (admin / escrow / dsb)
  let existingConversation = await prisma.conversation.findFirst({
      where: {
        itemId: item.id,
        AND: [
          { participants: { some: { userId: user.id } } },
          { participants: { some: { userId: item.sellerId } } }
        ]
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true } } }
        }
      }
    })

    if (!existingConversation) {
      // Fallback manual scan (jaga-jaga query di atas gagal match karena kondisi relasi Prisma)
      const allForItem = await prisma.conversation.findMany({
        where: { itemId: item.id },
        include: { participants: { include: { user: { select: { id: true, name: true } } } } }
      })
      const manual = allForItem.find(c => {
        const ids = c.participants.map(p => p.userId)
        return ids.includes(user.id) && ids.includes(item.sellerId)
      })
      if (manual) {
        console.log(`[CHAT_START] 🔄 Fallback found existing conversation via manual scan: ${manual.id}`)
        // Promote to existingConversation logic below
  existingConversation = manual
      }
    }

    if (existingConversation) {
      const sellerParticipant = existingConversation.participants.find(p => p.userId === item.sellerId)
      console.log(`[CHAT_START] ♻️ Reusing existing conversation ${existingConversation.id} (participants: ${existingConversation.participants.length})`)

      if (!forceNew) {
        return NextResponse.json({
          conversationId: existingConversation.id,
          warning: false, // langsung reuse tanpa modal biar ga bikin duplikat lagi
          reused: true,
          message: `Percakapan lama digunakan dengan ${sellerParticipant?.user.name || 'penjual'}`
        })
      }
      // forceNew akan lanjut bikin conversation baru di bawah
    }

    console.log(`[CHAT_START] 🆕 ${forceNew ? 'Force creating' : 'No existing conversation found, creating'} new one for item ${itemId}`)
    console.log(`[CHAT_START] Between: ${user.name} (${user.id}) and seller (${item.sellerId})`)

    // Create new conversation using transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Double-check if conversation was created while we were checking
      const doubleCheck = await tx.conversation.findFirst({
        where: {
          itemId: item.id,
          AND: [
            { participants: { some: { userId: user.id } } },
            { participants: { some: { userId: item.sellerId } } }
          ]
        },
        include: { participants: true }
      })

      if (doubleCheck) {
        console.log(`[CHAT_START] ⚠️ Detected race: existing conversation ${doubleCheck.id} appeared, reusing`)
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
