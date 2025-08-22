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

    const form = await req.formData()
    const file = form.get('file') as File | null
    const key = (form.get('key') as string) || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    if (!file) return NextResponse.json({ message: 'No file' }, { status: 400 })

    const p = getPool(pool)
    const buf = Buffer.from(await file.arrayBuffer())
    const put = await p.put(key, buf, file.type)
    const url = p.visibility === 'public' ? (put.url || p.getPublicUrl(put.key)) : null
    return NextResponse.json({ key: put.key, url })
  } catch (e) {
    console.error('[STORAGE_UPLOAD]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
