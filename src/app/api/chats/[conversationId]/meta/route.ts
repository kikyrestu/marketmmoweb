import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    
    console.log('=== SESSION DEBUG ===')
    console.log('Session user ID:', session?.user?.id)
    console.log('Session user email:', session?.user?.email)
    
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })
    
    console.log('Database user ID:', user.id)
    console.log('Database user email:', user.email)
    
    if (session?.user?.id !== user.id) {
      console.log('=== SESSION/DATABASE MISMATCH ===')
      console.log('Session ID:', session?.user?.id)
      console.log('Database ID:', user.id)
    }
    console.log('=== END SESSION DEBUG ===')

    const { conversationId } = await params

    const conversation = await (prisma as any).conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        item: { 
          select: { 
            id: true, 
            name: true, 
            imageUrl: true, 
            price: true,
            seller: { select: { id: true, name: true } }
          } 
        },
        participants: { 
          select: { 
            user: { select: { id: true, name: true } },
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }  // Ensure consistent ordering
        }
      }
    })
    if (!conversation) return NextResponse.json({ message: 'Conversation not found' }, { status: 404 })

    const participantIds = conversation.participants.map((p: any) => p.user.id)
    if (!participantIds.includes(user.id)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const other = conversation.participants.find((p: any) => p.user.id !== user.id)

    // DEBUG: Log participant info
    console.log('=== META API DEBUG ===')
    console.log('Current user ID:', user.id)
    console.log('Item seller ID:', conversation.item?.seller?.id)
    console.log('All participants:', conversation.participants.map((p: any) => ({ id: p.user.id, name: p.user.name })))
    console.log('Other participant:', other ? { id: other.user.id, name: other.user.name } : null)

    // PRIMARY LOGIC: Use participant creation order
    // The FIRST participant (index 0) is ALWAYS the BUYER (who initiated chat)
    // The SECOND participant (index 1) is ALWAYS the SELLER
    
    const currentUserIndex = conversation.participants.findIndex((p: any) => p.user.id === user.id)
    
    let currentUserRole: string
    let otherUserRole: string
    
    if (currentUserIndex === 0) {
      currentUserRole = 'BUYER'
      otherUserRole = 'SELLER'
    } else if (currentUserIndex === 1) {
      currentUserRole = 'SELLER'
      otherUserRole = 'BUYER'
    } else {
      // Fallback for edge cases
      currentUserRole = 'BUYER'
      otherUserRole = 'SELLER'
    }
    
    // VALIDATION: Check if roles make sense with item seller
    if (conversation.item?.seller?.id) {
      const itemSellerIsCurrentUser = conversation.item.seller.id === user.id
      const expectedRoleFromItem = itemSellerIsCurrentUser ? 'SELLER' : 'BUYER'
      
      if (expectedRoleFromItem !== currentUserRole) {
        console.log('=== ROLE VALIDATION WARNING ===')
        console.log('Role from participants:', currentUserRole)
        console.log('Expected role from item seller:', expectedRoleFromItem)
        console.log('Item seller ID:', conversation.item.seller.id)
        console.log('Current user ID:', user.id)
        console.log('Participant order is correct, item seller check is for validation only')
        // DO NOT override - participant order takes precedence
      }
    }

    console.log('=== FINAL ROLE DETERMINATION ===')
    console.log('Current user index:', currentUserIndex)
    console.log('Current user role:', currentUserRole)
    console.log('Other user role:', otherUserRole)
    console.log('=== END DEBUG ===')

    return NextResponse.json({
      id: conversation.id,
      item: conversation.item,
      otherUser: other?.user || null,
      currentUserRole,
      otherUserRole
    })
  } catch (e) {
    console.error('[CHAT_META_GET]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
