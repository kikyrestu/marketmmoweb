import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { bootstrapStorage } from '@/lib/storage/bootstrap'
import { getPool } from '@/lib/storage/manager'

function isNumber(v: any) { return typeof v === 'number' && !isNaN(v) }

export async function GET() {
  try {
    await prisma.$connect()
    const categoriesExist = await prisma.category.count() > 0
    if (!categoriesExist) {
      await prisma.category.createMany({
        data: [
          { name: 'Accounts', description: 'Game accounts for sale' },
          { name: 'Items', description: 'In-game items for sale' },
          { name: 'Currency', description: 'In-game currency for sale' },
          { name: 'Services', description: 'In-game services like power leveling' }
        ],
        skipDuplicates: true
      })
    }

    const items = await prisma.item.findMany({
      where: { 
        isAvailable: true
        // Include all items now, including temporary ones
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        isAvailable: true,
        createdAt: true,
        updatedAt: true,
        seller: { select: { id: true, name: true, role: true, verificationStatus: true } },
        category: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(items)
  } catch (error) {
    console.error('[ITEMS_GET]', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    let name: string | undefined
    let description: string | undefined
    let price: number | undefined
    let imageUrl: string | undefined
    let categoryId: string | undefined
    let rawFields: any = undefined
    let isTemporary: boolean = false
    let game: string | undefined
    let currency: string | undefined
    let images: string[] | undefined

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      name = formData.get('name') as string
      description = formData.get('description') as string
      const priceStr = formData.get('price') as string
      price = priceStr ? parseFloat(priceStr) : undefined
      categoryId = formData.get('categoryId') as string | undefined
      const fieldsStr = formData.get('fields') as string | undefined
      if (fieldsStr) { try { rawFields = JSON.parse(fieldsStr) } catch { /* ignore */ } }
      const file = formData.get('image') as File | null
      if (file && file.size > 0) {
        // Upload via storage pool
        bootstrapStorage()
        const pool = getPool('PUBLIC_IMAGES')
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const ext = (file.type && file.type.includes('/')) ? file.type.split('/')[1] : (file.name.split('.').pop() || 'png')
        const fileName = `item-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const key = `items/${fileName}`
        const put = await pool.put(key, buffer, file.type)
        imageUrl = pool.visibility === 'public' ? (put.url || pool.getPublicUrl(put.key) || undefined) : undefined
      }
    } else {
      const json = await request.json()
      name = json.name
      description = json.description
      price = json.price ? parseFloat(json.price) : undefined
      imageUrl = json.imageUrl
      categoryId = json.categoryId
      rawFields = json.fields
      isTemporary = json.isTemporary || false
      game = json.game
      currency = json.currency
      images = json.images
    }

    if (!name || !name.trim()) return NextResponse.json({ message: 'Name is required' }, { status: 400 })
    if (!description || !description.trim()) return NextResponse.json({ message: 'Description is required' }, { status: 400 })
    if (!price || price <= 0) return NextResponse.json({ message: 'Price must be greater than 0' }, { status: 400 })

    // For temporary items, allow any user role and use the first image from images array
    if (isTemporary) {
      if (images && images.length > 0) {
        imageUrl = images[0]
      }
    } else {
      // For regular items, require SELLER role
      if (session.user.role !== 'SELLER') return NextResponse.json({ message: 'Only sellers can add items' }, { status: 403 })
    }

    let itemCategory = null
    if (categoryId && categoryId !== 'temp-quick-sell') {
      itemCategory = await prisma.category.findUnique({ where: { id: categoryId } })
    }
    if (!itemCategory) {
      itemCategory = await prisma.category.findFirst({ where: { name: 'Items' } })
    }
    if (!itemCategory) return NextResponse.json({ message: 'Default category not found' }, { status: 500 })

    const seller = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!seller) return NextResponse.json({ message: 'Seller not found' }, { status: 404 })

    // For temporary items, skip field validation
    const valuesToCreate: any[] = []
    if (!isTemporary) {
      const defs = await (prisma as any).itemFieldDefinition.findMany({ where: { isActive: true, scope: 'GLOBAL' } })
      const defMap = new Map(defs.map((d: any) => [d.key, d]))
      const errors: string[] = []
      const fields = rawFields && typeof rawFields === 'object' ? rawFields : {}
      for (const [key, rawVal] of Object.entries(fields)) {
        const def: any = defMap.get(key)
        if (!def) { errors.push(`Unknown field ${key}`); continue }
        if (def.type === 'TEXT') {
          if (typeof rawVal !== 'string') { errors.push(`${key} must be string`); continue }
          const val = rawVal.trim()
          if (def.required && !val) errors.push(`${key} required`)
          valuesToCreate.push({ fieldDefinitionId: def.id, valueText: val || null })
        } else if (def.type === 'NUMBER') {
          const num = typeof rawVal === 'number' ? rawVal : Number(rawVal)
          if (!isNumber(num)) { errors.push(`${key} must be number`); continue }
          valuesToCreate.push({ fieldDefinitionId: def.id, valueNumber: Math.trunc(num) })
        } else if (def.type === 'SELECT') {
          if (typeof rawVal !== 'string') { errors.push(`${key} must be string`); continue }
          if (!Array.isArray(def.options) || def.options.length === 0) { errors.push(`${key} misconfigured options`); continue }
          if (!def.options.includes(rawVal)) { errors.push(`${key} invalid option`); continue }
          valuesToCreate.push({ fieldDefinitionId: def.id, valueText: rawVal })
        }
      }
      for (const def of defs) {
        if (def.required && !valuesToCreate.find(v => v.fieldDefinitionId === def.id)) errors.push(`Missing required field ${def.key}`)
      }
      if (errors.length) return NextResponse.json({ message: 'Validation failed', errors }, { status: 400 })
    }

    const item = await prisma.item.create({
      data: {
        name: name.trim(),
        description: description.trim(),
        price,
        imageUrl: imageUrl?.trim(),
        isAvailable: !isTemporary, // Temporary items are not available for purchase
        seller: { connect: { id: seller.id } },
        category: { connect: { id: itemCategory.id } }
      },
      select: { id: true }
    })

    if (valuesToCreate.length) {
      await (prisma as any).itemFieldValue.createMany({
        data: valuesToCreate.map(v => ({ ...v, itemId: item.id }))
      })
    }

    return NextResponse.json({ id: item.id }, { status: 201 })
  } catch (error) {
    console.error('[ITEMS_POST]', error)
    return NextResponse.json({ message: 'Internal error' }, { status: 500 })
  }
}
