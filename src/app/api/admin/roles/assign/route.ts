import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdmin } from '@/lib/rbac'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, role: true } })
    if (!(await isAdmin(me?.role))) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const contentType = req.headers.get('content-type') || ''
    let userId: string | null = null
    let role: string | null = null
    let scope: string | null = null
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      userId = (form.get('userId') as string) || null
      role = (form.get('role') as string) || null
      scope = (form.get('scope') as string) || null
    } else {
      const body = await req.json()
      userId = body.userId
      role = body.role
      scope = body.scope
    }

    if (!userId || !role) return NextResponse.json({ message: 'userId and role required' }, { status: 400 })

    await (prisma as any).userRoleAssignment.upsert({
      where: { userId_role_scope: { userId, role, scope } },
      update: {},
      create: { userId, role, scope }
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[ADMIN_ROLE_ASSIGN]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
