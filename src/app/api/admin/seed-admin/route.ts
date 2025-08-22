import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

// POST /api/admin/seed-admin  { secret: string }
// Creates default admin (email: admin@example.com password: admin123) if not exists
export async function POST(req: Request) {
  try {
    const { secret } = await req.json().catch(()=>({}))
    if (!process.env.SEED_ADMIN_SECRET) {
      return NextResponse.json({ message: 'SEED_ADMIN_SECRET not set on server' }, { status: 500 })
    }
    if (secret !== process.env.SEED_ADMIN_SECRET) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const email = 'admin@example.com'
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      if (existing.role !== 'ADMIN') {
        await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } })
      }
      return NextResponse.json({ message: 'Admin already exists', email, password: 'admin123' })
    }

    const hashedPassword = await bcrypt.hash('admin123', 10)
    const user = await prisma.user.create({
      data: {
        name: 'Administrator',
        email,
        hashedPassword,
        role: 'ADMIN'
      },
      select: { id: true, email: true, role: true }
    })
    return NextResponse.json({ message: 'Admin created', email, password: 'admin123', user })
  } catch (e) {
    console.error('[SEED_ADMIN]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
