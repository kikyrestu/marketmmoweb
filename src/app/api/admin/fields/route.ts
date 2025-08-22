import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function requireAdmin(role?: string | null) {
  return role === 'ADMIN'
}

// GET /api/admin/fields?includeInactive=1
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!requireAdmin((session.user as any).role)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get('includeInactive') === '1'
  const defs = await (prisma as any).itemFieldDefinition.findMany({
      where: { ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    })
    return NextResponse.json(defs)
  } catch (e) {
    console.error('[ADMIN_FIELDS_GET]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// POST { key,label,type,required,order,options,constraints }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!requireAdmin((session.user as any).role)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const { key, label, type, required, order, options, constraints, scope } = body
    if (!key || !label || !type) return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    if (!/^([a-z0-9_]+)$/.test(key)) return NextResponse.json({ message: 'Invalid key format' }, { status: 400 })
    if (!['TEXT','NUMBER','SELECT'].includes(type)) return NextResponse.json({ message: 'Unsupported type' }, { status: 400 })
    if (type === 'SELECT' && (!Array.isArray(options) || options.length === 0)) return NextResponse.json({ message: 'Options required for SELECT' }, { status: 400 })
  const def = await (prisma as any).itemFieldDefinition.create({
      data: {
        key,
        label,
        type,
        required: !!required,
        order: order ?? 0,
        scope: scope || 'GLOBAL',
        options: type === 'SELECT' ? options : null,
        constraints: constraints || null
      }
    })
    return NextResponse.json(def, { status: 201 })
  } catch (e: any) {
    if (e.code === 'P2002') return NextResponse.json({ message: 'Key already exists in scope' }, { status: 409 })
    console.error('[ADMIN_FIELDS_POST]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/admin/fields { id, ...changes }
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    if (!requireAdmin((session.user as any).role)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    const body = await req.json()
    const { id, label, required, order, options, isActive, constraints } = body
    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 })
  const existing = await (prisma as any).itemFieldDefinition.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    if (options && existing.type !== 'SELECT') return NextResponse.json({ message: 'Options allowed only for SELECT' }, { status: 400 })
  const def = await (prisma as any).itemFieldDefinition.update({
      where: { id },
      data: {
        label: label ?? existing.label,
        required: typeof required === 'boolean' ? required : existing.required,
        order: typeof order === 'number' ? order : existing.order,
        options: existing.type === 'SELECT' ? (options ?? existing.options) : null,
        isActive: typeof isActive === 'boolean' ? isActive : existing.isActive,
        constraints: constraints ?? existing.constraints
      }
    })
    return NextResponse.json(def)
  } catch (e) {
    console.error('[ADMIN_FIELDS_PATCH]', e)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
