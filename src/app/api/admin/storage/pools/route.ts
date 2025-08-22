import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { bootstrapStorage } from '@/lib/storage/bootstrap'
import { listPools } from '@/lib/storage/manager'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  try {
    bootstrapStorage()
    const { searchParams } = new URL(req.url)
    const check = searchParams.get('check') === '1'
    const pools = listPools()
    if (check) {
      await Promise.all(pools.map(p => p.healthCheck()))
    }
    const infos = pools.map(p => p.getInfo())
    return NextResponse.json({ pools: infos })
  } catch (e) {
    console.error('[ADMIN_STORAGE_POOLS]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
