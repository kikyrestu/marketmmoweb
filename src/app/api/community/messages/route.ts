import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { chatHub } from '@/lib/chatHub'
//
import { bootstrapStorage } from '@/lib/storage/bootstrap'
import { getPool } from '@/lib/storage/manager'

// GET /api/community/messages?cursor=messageId (pagination newest -> older)
export async function GET(req: Request) {
  try {
    // Public read: session optional
    const session = await getServerSession(authOptions)
    if (session?.user?.email) {
      // touch user to validate (ignore errors silently for read-only)
      try { await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } }) } catch {}
    }

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor') // message id
    const roomSlug = searchParams.get('room') || undefined
    let room: any = null
    if (roomSlug) {
      room = await (prisma as any).communityRoom.findUnique({ where: { slug: roomSlug }, select: { id: true, slug: true, wordFilter: true } })
      if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 })
      // auto-join membership if logged in
      if (session?.user?.email) {
        try {
          const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
          if (user) {
            await (prisma as any).communityRoomMember.upsert({
              where: { roomId_userId: { roomId: room.id, userId: user.id } },
              update: {},
              create: { roomId: room.id, userId: user.id }
            })
          }
        } catch {}
      }
    }
    const take = Number(searchParams.get('limit') || 40)

  const messages = await (prisma as any).communityMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: room ? { roomId: room.id } : { roomId: null },
      select: { id: true, body: true, createdAt: true, senderId: true, replyToId: true, imageUrl: true, type: true, itemId: true, itemData: true, replyTo: { select: { id: true, body: true, sender: { select: { name: true } } } }, sender: { select: { name: true } } }
    })

    const hasMore = messages.length > take
    const slice = hasMore ? messages.slice(0, -1) : messages

    return NextResponse.json({
      room: room ? { slug: room.slug } : null,
      messages: slice.reverse().map((m: any) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        senderId: m.senderId,
        senderName: m.sender.name,
        replyToId: m.replyToId,
        replyPreview: m.replyTo ? { id: m.replyTo.id, body: m.replyTo.body, senderName: m.replyTo.sender.name } : null,
        imageUrl: m.imageUrl,
        type: m.type,
        itemId: m.itemId,
        itemData: m.itemData
      })),
      nextCursor: hasMore ? slice[0].id : null
    })
  } catch (e) {
    console.error('[COMMUNITY_GET]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// POST /api/community/messages { body }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })
    const contentType = req.headers.get('content-type') || ''
    let body: string | undefined
    let replyToId: string | undefined
    let imageUrl: string | undefined
    let roomSlug: string | undefined
    let room: any = null
    let jsonData: any = null
    let type: string | undefined = undefined;
    let itemId: string | undefined = undefined;
    let itemData: any = undefined;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      body = (form.get('body') as string) || ''
      replyToId = (form.get('replyToId') as string) || undefined
      roomSlug = (form.get('room') as string) || undefined
      type = (form.get('type') as string) || undefined;
      itemId = (form.get('itemId') as string) || undefined;
      const file = form.get('image') as File | null
      if (file && file.size > 0) {
        if (!file.type.startsWith('image/')) return NextResponse.json({ message: 'Invalid image type' }, { status: 415 })
        if (file.size > 5 * 1024 * 1024) return NextResponse.json({ message: 'Image too large (max 5MB)' }, { status: 413 })
        // Upload via storage pool
        bootstrapStorage()
        const pool = getPool('COMMUNITY_ATTACHMENTS')
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const ext = (file.type && file.type.includes('/')) ? file.type.split('/')[1] : (file.name.split('.').pop() || 'png')
        const fileName = `community-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const key = `community/${fileName}`
        const put = await pool.put(key, buffer, file.type)
        imageUrl = pool.visibility === 'public' ? (put.url || pool.getPublicUrl(put.key) || undefined) : undefined
      }
    } else {
      jsonData = await req.json()
      body = jsonData.body
      replyToId = jsonData.replyToId
      roomSlug = jsonData.room
      type = jsonData.type;
      itemId = jsonData.itemId;
      itemData = jsonData.itemData;
    }

    if (roomSlug) {
      room = await (prisma as any).communityRoom.findUnique({ where: { slug: roomSlug }, select: { id: true, slug: true, wordFilter: true } })
      if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 })
    }

    if ((!body || !body.trim()) && !imageUrl) return NextResponse.json({ message: 'Empty message' }, { status: 400 })
    if (body && body.length > 5000) return NextResponse.json({ message: 'Message too long' }, { status: 413 })

    // word filter enforcement (simple whole-word case-insensitive replace with asterisks)
    if (body && room?.wordFilter?.length) {
      const words: string[] = room.wordFilter.filter((w: string) => w.trim().length > 0)
      if (words.length) {
        const pattern = new RegExp(`\\b(${words.map(w=>w.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')).join('|')})\\b`, 'gi')
        body = body.replace(pattern, (match: string) => '*'.repeat(match.length))
      }
    }

    let parent: any = null
    if (replyToId) {
      parent = await prisma.communityMessage.findUnique({ where: { id: replyToId }, select: { id: true, body: true, sender: { select: { name: true } } } })
    }

    const msg = await (prisma as any).communityMessage.create({
      data: {
        body: (body || '').trim(),
        senderId: user.id,
        imageUrl,
        ...(replyToId ? { replyToId } : {}),
        ...(room ? { roomId: room.id } : { roomId: null }),
        ...(type ? { type } : {}),
        ...(itemId ? { itemId } : {}),
        ...(itemData ? { itemData } : {}),
      },
      select: { id: true, body: true, createdAt: true, senderId: true, replyToId: true, imageUrl: true, type: true, itemId: true, itemData: true, replyTo: { select: { id: true, body: true, sender: { select: { name: true } } } }, sender: { select: { name: true } } }
    })

    // Broadcast via chat hub
    const messageData = {
      id: msg.id,
      body: msg.body,
      createdAt: msg.createdAt,
      senderId: msg.senderId,
      senderName: msg.sender.name,
      replyToId: msg.replyToId,
      replyPreview: parent ? { id: parent.id, body: parent.body, senderName: parent.sender.name } : null,
      imageUrl: msg.imageUrl,
      type: msg.type,
      itemId: msg.itemId,
      itemData: msg.itemData,
      roomSlug: room?.slug
    }
    chatHub.broadcastAll({ type: 'community.message.new', message: messageData } as any)

    return NextResponse.json(messageData)
  } catch (e) {
    console.error('[COMMUNITY_POST]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
