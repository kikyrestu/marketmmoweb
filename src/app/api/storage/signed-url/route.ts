import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPool, hasPool } from '@/lib/storage/manager'
import { bootstrapStorage } from '@/lib/storage/bootstrap'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

  try {
  bootstrapStorage()
    const { searchParams } = new URL(req.url)
    const pool = searchParams.get('pool') || ''
    const key = searchParams.get('key') || ''
    const ttl = Number(searchParams.get('ttl') || '900')
    if (!pool || !hasPool(pool) || !key) return NextResponse.json({ message: 'Bad request' }, { status: 400 })

    const p = getPool(pool)
    const url = await p.getSignedUrl(key, ttl)
    return NextResponse.json({ url })
  } catch (e) {
    console.error('[STORAGE_SIGNED_URL]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
