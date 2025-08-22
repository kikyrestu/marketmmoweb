import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { bootstrapStorage } from '@/lib/storage/bootstrap'
import { getPool } from '@/lib/storage/manager'

// POST create community room
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  try {
    const formData = await req.formData()
    const name = (formData.get('name') || '').toString().trim()
    if (!name) return NextResponse.json({ message: 'Name required' }, { status: 400 })
    const slugRaw = (formData.get('slug') || name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')) as string
    const slug = slugRaw.trim()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json({ message: 'Invalid slug' }, { status: 400 })
    }
  const tags = (formData.get('tags') || '').toString().split(',').map(t=>t.trim()).filter(Boolean)
  const wordFilter = (formData.get('wordFilter') || '').toString().split(',').map(w=>w.trim()).filter(Boolean)
    const gameName = (formData.get('gameName') || '').toString().trim() || null
  const isTradableRaw = (formData.get('isTradable') || '').toString().toLowerCase()
  const isTradable = ['1','true','yes','on','trade','tradable'].includes(isTradableRaw)
  const status = (((formData.get('status') || '') as string).toUpperCase()) as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

    // Handle image upload via storage pool (PUBLIC_IMAGES)
    let imageUrl: string | null = null
    const image = formData.get('image') as File | null
    if (image && image.size > 0) {
      bootstrapStorage()
      const pool = getPool('PUBLIC_IMAGES')
      const ext = (image.type && image.type.includes('/')) ? image.type.split('/')[1] : (image.name.split('.').pop() || 'png')
      const fileName = `room-${slug}-${Date.now()}-${randomUUID()}.${ext}`
      const key = `community/rooms/${fileName}`
      const buf = Buffer.from(await image.arrayBuffer())
      const put = await pool.put(key, buf, image.type)
      imageUrl = pool.visibility === 'public' ? (put.url || pool.getPublicUrl(put.key) || null) : null
    }

  const existing = await (prisma as any).communityRoom.findUnique({ where: { slug } })
    if (existing) return NextResponse.json({ message: 'Slug already used' }, { status: 409 })

  const room = await prisma.$transaction(async (tx) => {
    const created = await (tx as any).communityRoom.create({
        data: {
          name,
          slug,
            imageUrl,
          tags,
          wordFilter,
          gameName,
          isTradable,
          createdById: session.user.id,
      ...(status === 'DRAFT' || status === 'ARCHIVED' ? { status } : {})
        }
      })
  // Note: Membership is open; we auto-join users on first activity. No need to pre-add.
      return created
    })

    return NextResponse.json(room)
  } catch (e: any) {
    console.error('[COMMUNITY_ROOM_CREATE]', e)
    return NextResponse.json({ message: 'Error creating room' }, { status: 500 })
  }
}

// GET list rooms
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const includeAll = searchParams.get('includeAll') === '1'
  const rooms = await (prisma as any).communityRoom.findMany({ where: includeAll ? {} : { status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, slug: true, imageUrl: true, tags: true, wordFilter: true, gameName: true, isTradable: true, createdAt: true, status: true, _count: { select: { members: true, messages: true } } } })
  return NextResponse.json(rooms)
}

// PATCH update room status
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id, status } = await req.json()
    if (!id || !status) return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })
    const updated = await (prisma as any).communityRoom.update({ where: { id }, data: { status } })
    return NextResponse.json(updated)
  } catch (e) {
  console.error('[COMMUNITY_ROOM_PATCH]', e)
  return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
