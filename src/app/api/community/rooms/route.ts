import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const rooms = await (prisma as any).communityRoom.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
  select: { id: true, name: true, slug: true, tags: true, gameName: true, imageUrl: true, isTradable: true, _count: { select: { members: true, messages: true } } }
    })
    return NextResponse.json(rooms)
  } catch (e) {
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
