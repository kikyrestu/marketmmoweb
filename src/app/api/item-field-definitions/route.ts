import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/item-field-definitions?gameId=... (gameId reserved future)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const gameId = searchParams.get('gameId') || undefined
    const defs = await (prisma as any).itemFieldDefinition.findMany({
      where: { isActive: true, ...(gameId ? { OR: [ { scope: 'GLOBAL' }, { scope: 'GAME', gameId } ] } : { scope: 'GLOBAL' }) },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    })
    return NextResponse.json(defs.map((d: any) => ({ id: d.id, key: d.key, label: d.label, type: d.type, required: d.required, order: d.order, options: d.options || null })))
  } catch (e) {
    console.error('[PUBLIC_FIELD_DEFS]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
