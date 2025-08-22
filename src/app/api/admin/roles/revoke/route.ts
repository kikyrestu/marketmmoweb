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
    let id: string | null = null
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      id = (form.get('id') as string) || null
    } else {
      const body = await req.json()
      id = body.id
    }

    if (!id) return NextResponse.json({ message: 'id required' }, { status: 400 })

    await (prisma as any).userRoleAssignment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[ADMIN_ROLE_REVOKE]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
