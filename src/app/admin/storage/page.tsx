import { headers as nextHeaders, cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { StorageEditor } from './_components/storage-editor'

export const dynamic = 'force-dynamic'

async function fetchPools() {
  const h = await nextHeaders()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const base = `${proto}://${host}`
  const ck = await cookies()
  const cookieHeader = ck.getAll().map(c => `${c.name}=${c.value}`).join('; ')
  const res = await fetch(`${base}/api/admin/storage/pools?check=1`, { headers: { cookie: cookieHeader }, cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load storage pools')
  return res.json() as Promise<{ pools: Array<{ name: string; visibility: string; strategy: string; providers: Array<{ id: string; type: string; url: string; healthy: boolean; errors: number }> }> }>
}

export default async function AdminStoragePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    // layout should redirect, but keep safe
    return null
  }
  const data = await fetchPools()
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Storage</h1>
          <p className="text-sm text-muted-foreground">Pools and providers</p>
        </div>
        <form action="/admin/storage" method="GET">
          <button className="px-3 py-2 text-sm rounded-md border hover:bg-accent" formAction="/admin/storage">Refresh</button>
        </form>
      </div>
  <StorageEditor initial={data.pools} />
    </div>
  )
}
