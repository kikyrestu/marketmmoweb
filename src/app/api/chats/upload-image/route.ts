import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { chatHub } from '@/lib/chatHub'
import { notificationHub } from '@/lib/notificationHub'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get('image') as File
    const conversationId = formData.get('conversationId') as string

    if (!file || !conversationId) {
      return NextResponse.json({ message: 'Missing file or conversationId' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Only image files are allowed' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Check if user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: conversationId, userId: user.id },
      select: { id: true }
    })
    if (!participant) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const fileName = `${randomUUID()}.${fileExtension}`
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'chat')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, continue
    }

    // Save file
    const filePath = join(uploadsDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create image URL
    const imageUrl = `/uploads/chat/${fileName}`

    // Create message with image
    const message = await prisma.chatMessage.create({
      data: {
        conversation: { connect: { id: conversationId } },
        sender: { connect: { id: user.id } },
        body: '', // Empty body for image messages
        imageUrl: imageUrl
      },
      select: { 
        id: true, 
        body: true, 
        createdAt: true, 
        senderId: true,
        imageUrl: true,
        sender: { select: { role: true, name: true } }
      }
    })

    // Update conversation last message
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    })

    try {
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: conversationId },
        select: { userId: true }
      })
      const ids = participants.map((p: any) => p.userId)
      
      chatHub.broadcastToUsers(ids, (uid) => ({
        type: 'conversation.update',
        conversationId: conversationId,
        lastMessage: { 
          id: message.id, 
          body: message.body, 
          createdAt: message.createdAt.toISOString(), 
          senderId: message.senderId,
          imageUrl: message.imageUrl,
          sender: message.sender
        },
        unreadCount: uid === message.senderId ? 0 : 1
      }))
      
      chatHub.broadcastToUsers(ids, () => ({
        type: 'message.new',
        conversationId: conversationId,
        message: { 
          id: message.id, 
          body: message.body, 
          createdAt: message.createdAt.toISOString(), 
          senderId: message.senderId,
          imageUrl: message.imageUrl,
          sender: message.sender
        }
      }))

      notificationHub.broadcastToUsers(ids.filter((id: string) => id !== message.senderId), () => ({
        type: 'notification.new',
        conversationId: conversationId,
        notification: { 
          id: message.id, 
          type: 'chat', 
          title: 'New image', 
          message: `${user.name} sent an image`,
          createdAt: new Date().toISOString()
        }
      }))
    } catch (err) { 
      console.error('Broadcast error', err) 
    }

    return NextResponse.json({ message })
  } catch (e) {
    console.error('[CHAT_UPLOAD_IMAGE]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
