import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { StoragePoolConfig } from '@/lib/storage/types'
import { writeConfigToStore } from '@/lib/storage/config-store'
import { loadAndRegisterStorage } from '@/lib/storage/bootstrap'

export const dynamic = 'force-dynamic'

function ensureAdmin(session: any) {
  return session?.user && session.user.role === 'ADMIN'
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!ensureAdmin(session)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    if (!Array.isArray(body)) return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })
    // Minimal validation
    const cfgs: StoragePoolConfig[] = body.filter((p: any) => p && p.name && Array.isArray(p.providers))
    await writeConfigToStore(cfgs)
    // Reload runtime pools
    await loadAndRegisterStorage()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[ADMIN_STORAGE_PUT]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
