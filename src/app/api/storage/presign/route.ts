import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPool, hasPool } from '@/lib/storage/manager'
import { bootstrapStorage } from '@/lib/storage/bootstrap'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
  bootstrapStorage()
    const { searchParams } = new URL(req.url)
    const pool = searchParams.get('pool') || ''
    if (!pool || !hasPool(pool)) return NextResponse.json({ message: 'Unknown pool' }, { status: 400 })

    const body = await req.json().catch(()=> ({})) as { key?: string; contentType?: string; size?: number }
    const key = body.key || `${Date.now()}-${Math.random().toString(36).slice(2)}`

    const p = getPool(pool)
    const res = await p.presign(key, body.contentType, body.size)
    return NextResponse.json(res)
  } catch (e) {
    console.error('[STORAGE_PRESIGN]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
