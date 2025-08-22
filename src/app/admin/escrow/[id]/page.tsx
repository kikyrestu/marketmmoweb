import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isEscrowAdmin } from '@/lib/rbac'
import { cookies, headers as nextHeaders } from 'next/headers'

export const dynamic = 'force-dynamic'

async function fetchEscrow(id: string) {
  const h = await nextHeaders()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const base = `${proto}://${host}`
  const ck = await cookies()
  const cookieHeader = ck.getAll().map(c => `${c.name}=${c.value}`).join('; ')
  const res = await fetch(`${base}/api/escrow/${id}`, { headers: { cookie: cookieHeader } })
  if (!res.ok) throw new Error('Failed to load')
  return res.json()
}

export default async function AdminEscrowDetailPage(props: any) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !(await isEscrowAdmin(session.user.id, session.user.role as any))) {
    return (<div className="p-6 text-sm text-red-600">Forbidden</div>)
  }
  const { id } = await props.params
  const data = await fetchEscrow(id)
  const e = data.escrow
  const logs: any[] = data.logs || []
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Escrow Detail</h1>
        <p className="text-sm text-muted-foreground">ID: <span className='font-mono'>{e.id}</span></p>
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='border rounded p-4'>
          <p className='text-sm'>Status: <span className='font-mono'>{e.status}</span></p>
          <p className='text-sm'>Amount: Rp {e.totalAmount?.toLocaleString()}</p>
          <p className='text-sm'>Fee: Rp {e.fee?.toLocaleString()}</p>
        </div>
        <div className='border rounded p-4'>
          <form method='post' action={`/api/escrow/${e.id}/action`} className='space-y-2'>
            <div className='flex gap-2'>
              <button name='action' value='HOLD' className='px-3 py-2 rounded-md border'>Set Funds Held</button>
              <button name='action' value='RELEASE' className='px-3 py-2 rounded-md border'>Release</button>
              <button name='action' value='REFUND' className='px-3 py-2 rounded-md border'>Refund</button>
              <button name='action' value='DISPUTE' className='px-3 py-2 rounded-md border'>Dispute</button>
              <button name='action' value='RESOLVE' className='px-3 py-2 rounded-md border'>Resolve</button>
            </div>
          </form>
        </div>
      </div>
      <div className='border rounded p-4'>
        <p className='font-medium text-sm mb-2'>Audit Log</p>
        <div className='space-y-2'>
          {logs.map((l,i) => (
            <div key={i} className='text-xs border rounded px-2 py-1 flex justify-between'>
              <span>{new Date(l.createdAt).toLocaleString()}</span>
              <span className='font-mono'>{l.action}</span>
            </div>
          ))}
          {logs.length === 0 && <p className='text-xs text-muted-foreground'>Belum ada log</p>}
        </div>
      </div>
    </div>
  )
}
