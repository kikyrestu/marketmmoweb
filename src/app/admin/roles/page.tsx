import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/rbac'
import { redirect } from 'next/navigation'
import AssignRoleForm from './AssignRoleForm'

export const dynamic = 'force-dynamic'

async function getData() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, role: true }
  })
  const assignments = await (prisma as any).userRoleAssignment.findMany({ orderBy: { createdAt: 'desc' } })
  return { users, assignments }
}

export default async function RolesAdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/auth/signin?callbackUrl=/admin/roles')
  const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } })
  const allowed = await isAdmin(me?.role)
  if (!allowed) redirect('/auth/admin')

  const { users, assignments } = await getData()
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Penugasan Peran</h1>

      <div className="border rounded p-4 mb-8">
        <h2 className="font-semibold mb-2">Tetapkan Admin Escrow</h2>
        <AssignRoleForm users={users} />
      </div>

      <div className="border rounded p-4">
        <h2 className="font-semibold mb-2">Penugasan Saat Ini</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Pengguna</th>
              <th className="py-2">Peran</th>
              <th className="py-2">Cakupan</th>
              <th className="py-2 w-32">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a:any)=>{
              const u = users.find(x=> x.id===a.userId)
              return (
                <tr key={a.id} className="border-b">
                  <td className="py-2">{u?.name || u?.email}</td>
                  <td className="py-2">{a.role}</td>
                  <td className="py-2">{a.scope || '-'}</td>
                  <td className="py-2">
                    <form method="post" action="/api/admin/roles/revoke" onSubmit={(e)=>{e.preventDefault(); const f=e.currentTarget as HTMLFormElement; const data=new FormData(f); fetch('/api/admin/roles/revoke',{method:'POST',body:data}).then(async r=>{ if(r.ok) location.reload() })}}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="text-red-600 hover:underline">Revoke</button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
