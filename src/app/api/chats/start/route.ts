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

    const buyerId = user.id
    const sellerId = item.sellerId
    const signature = `${item.id}:${buyerId}:${sellerId}`

    // 0) Fast-path: if ConversationKey exists, reuse immediately
    try {
      const key = await prisma.conversationKey.findUnique({
        where: { signature },
        include: { conversation: { include: { participants: { include: { user: { select: { id: true, name: true } } } } } } }
      })
      if (key?.conversation) {
        console.log(`[CHAT_START] 🔑 Found ConversationKey, reusing conversation ${key.conversationId}`)
        return NextResponse.json({
          conversationId: key.conversationId,
          warning: false,
          reused: true,
          message: `Percakapan lama digunakan dengan ${key.conversation.participants.find((p: any)=>p.userId===sellerId)?.user.name || 'penjual'}`
        })
      }
    } catch {}

    // Cari conversation yang mengandung BOTH current user & seller untuk item ini, walau ada participant tambahan (admin / escrow / dsb)
    let existingConversation = await prisma.conversation.findFirst({
      where: {
        itemId: item.id,
        AND: [
          { participants: { some: { userId: buyerId } } },
          { participants: { some: { userId: sellerId } } }
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
        return ids.includes(buyerId) && ids.includes(sellerId)
      })
      if (manual) {
        console.log(`[CHAT_START] 🔄 Fallback found existing conversation via manual scan: ${manual.id}`)
        // Promote to existingConversation logic below
  existingConversation = manual
      }
    }

    if (existingConversation) {
      const sellerParticipant = existingConversation.participants.find(p => p.userId === sellerId)
      console.log(`[CHAT_START] ♻️ Reusing existing conversation ${existingConversation.id} (participants: ${existingConversation.participants.length})`)

      // Ensure ConversationKey exists for fast future lookups
      try {
        await prisma.conversationKey.upsert({
          where: { signature },
          update: {},
          create: { conversationId: existingConversation.id, itemId: item.id, buyerId, sellerId, signature }
        })
      } catch {}

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

    // Create new conversation wrapped with unique key creation to avoid duplicates under race
    const result = await prisma.$transaction(async (tx) => {
      // Re-check by key inside transaction
      const keyExisting = await tx.conversationKey.findUnique({ where: { signature } })
      if (keyExisting) {
        console.log(`[CHAT_START] ⚠️ Key exists in tx, reusing ${keyExisting.conversationId}`)
        return await tx.conversation.findUniqueOrThrow({ where: { id: keyExisting.conversationId } })
      }

      // Create new conversation
      const newConversation = await tx.conversation.create({
        data: {
          itemId: item.id,
          participants: {
            create: [
              { userId: buyerId },
              { userId: sellerId }
            ]
          }
        }
      })
      console.log(`[CHAT_START] Created new conversation ${newConversation.id}`)

      // Try to create key; handle race by deleting new conversation and returning existing
      try {
        await tx.conversationKey.create({
          data: { conversationId: newConversation.id, itemId: item.id, buyerId, sellerId, signature }
        })
        return newConversation
      } catch (err: any) {
        if (err?.code === 'P2002') {
          // Unique violation: another tx created the key; cleanup and reuse
          try { await tx.conversation.delete({ where: { id: newConversation.id } }) } catch {}
          const key = await tx.conversationKey.findUnique({ where: { signature } })
          if (key) {
            console.log(`[CHAT_START] ♻️ Race resolved, reusing conversation ${key.conversationId}`)
            return await tx.conversation.findUniqueOrThrow({ where: { id: key.conversationId } })
          }
        }
        throw err
      }
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
