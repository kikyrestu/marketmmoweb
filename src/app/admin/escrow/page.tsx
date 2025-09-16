import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isEscrowAdmin } from '@/lib/rbac'
import { cookies, headers as nextHeaders } from 'next/headers'
import Link from 'next/link'
import { EscrowTable } from './escrow-table'

export const dynamic = 'force-dynamic'

async function fetchEscrows() {
  const h = await nextHeaders()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const base = `${proto}://${host}`
  const ck = await cookies()
  const cookieHeader = ck.getAll().map(c => `${c.name}=${c.value}`).join('; ')
  const res = await fetch(`${base}/api/escrow`, { headers: { cookie: cookieHeader } })
  if (!res.ok) throw new Error('Failed to load')
  const data = await res.json();
  return data.escrows || [];
}

export default async function AdminEscrowPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(await isEscrowAdmin(session.user.id, session.user.role as any))) {
    // soft block
    return (<div className="p-6 text-sm text-red-600">Forbidden</div>)
  }
  const escrows: Array<{ id: string; status: string; totalAmount: number; fee: number; createdAt: string; conversationId: string } & { buyer: { name: string } | null, seller: { name: string } | null }> = await fetchEscrows()
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Kasus Escrow</h1>
          <p className="text-sm text-muted-foreground">Kelola escrow & sengketa</p>
        </div>
      </div>
      <EscrowTable escrows={escrows} />
    </div>
  )
}
