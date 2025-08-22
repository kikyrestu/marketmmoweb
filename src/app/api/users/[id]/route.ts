import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Next.js 15: params now a promise; await it before accessing properties.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, createdAt: true, isVerified: true, verificationStatus: true }
    })
    if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch (e) {
    console.error('[USER_PUBLIC_GET]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
