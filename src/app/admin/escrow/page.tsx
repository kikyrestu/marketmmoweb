import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isEscrowAdmin } from '@/lib/rbac'
import { cookies, headers as nextHeaders } from 'next/headers'
import Link from 'next/link'

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
  return res.json()
}

export default async function AdminEscrowPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(await isEscrowAdmin(session.user.id, session.user.role as any))) {
    // soft block
    return (<div className="p-6 text-sm text-red-600">Forbidden</div>)
  }
  const escrows: Array<{ id: string; status: string; totalAmount: number; fee: number; createdAt: string } & { buyer: { name: string } | null, seller: { name: string } | null }> = await fetchEscrows()
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Escrow Cases</h1>
          <p className="text-sm text-muted-foreground">Kelola escrow & dispute</p>
        </div>
      </div>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-accent">
            <tr className="text-left">
              <th className="p-2">ID</th>
              <th className="p-2">Status</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Fee</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {escrows.map(e => (
              <tr key={e.id} className="border-t">
                <td className="p-2 font-mono text-xs">{e.id.slice(0,8)}…</td>
                <td className="p-2"><span className="inline-flex items-center rounded px-2 py-1 border text-[10px]">{e.status}</span></td>
                <td className="p-2">Rp {e.totalAmount?.toLocaleString()}</td>
                <td className="p-2">Rp {e.fee?.toLocaleString()}</td>
                <td className="p-2 text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="p-2"><Link href={`/admin/escrow/${e.id}`} className="underline">Detail</Link></td>
              </tr>
            ))}
            {escrows.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={6}>Belum ada kasus escrow</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
