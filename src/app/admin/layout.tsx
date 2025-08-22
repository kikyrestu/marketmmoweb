import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { AdminNav } from './_components/admin-nav'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 border-r bg-sidebar/80 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60 flex flex-col">
        <div className="px-3 py-3 border-b">
          <h1 className="text-base font-semibold tracking-tight">Admin Panel</h1>
          <p className="text-[10px] text-muted-foreground">Manage marketplace</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav />
        </div>
        <div className="p-2 text-[10px] text-muted-foreground border-t">v0.1.0</div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
