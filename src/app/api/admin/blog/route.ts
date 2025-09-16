import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const posts = await (prisma as any).blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, status: true, publishedAt: true, createdAt: true, updatedAt: true }
  })
  return NextResponse.json(posts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  console.log('[ADMIN_BLOG_POST] Session:', session);
  if (!session?.user) {
    console.log('[ADMIN_BLOG_POST] No user in session');
    return NextResponse.json({ message: 'Unauthorized: No user in session' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    console.log('[ADMIN_BLOG_POST] User role is not ADMIN:', session.user.role);
    return NextResponse.json({ message: 'Unauthorized: User role is not ADMIN' }, { status: 401 })
  }
  try {
    const ct = req.headers.get('content-type') || ''
    let title: string | undefined
    let slug: string | undefined
    let excerpt: string | undefined
    let content: string | undefined
    let coverImageUrl: string | undefined
    let tags: string[] = []
    let status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' = 'DRAFT'

    if (ct.includes('multipart/form-data')) {
      const form = await req.formData()
      title = (form.get('title') as string)?.trim()
      slug = ((form.get('slug') as string) || (title || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')).trim()
      excerpt = (form.get('excerpt') as string) || undefined
      content = (form.get('content') as string) || ''
      const tagsStr = (form.get('tags') as string) || ''
      tags = tagsStr ? tagsStr.split(',').map(t=>t.trim()).filter(Boolean) : []
      const statusRaw = (form.get('status') as string) || 'DRAFT'
      status = (['DRAFT','PUBLISHED','ARCHIVED'].includes(statusRaw.toUpperCase()) ? statusRaw.toUpperCase() : 'DRAFT') as any
      // Optional cover image URL (use storage page to upload externally if needed)
      coverImageUrl = (form.get('coverImageUrl') as string) || undefined
    } else {
      const json = await req.json()
  title = (json.title || '').trim()
  const t = title || ''
  slug = (json.slug || t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')).trim()
      excerpt = json.excerpt || undefined
      content = json.content || ''
      tags = Array.isArray(json.tags) ? json.tags : []
      coverImageUrl = json.coverImageUrl || undefined
      status = (json.status || 'DRAFT').toUpperCase()
    }

    if (!title) return NextResponse.json({ message: 'Title required' }, { status: 400 })
    if (!content || !content.trim()) return NextResponse.json({ message: 'Content required' }, { status: 400 })
    // unique slug
    const existing = await (prisma as any).blogPost.findUnique({ where: { slug } })
    if (existing) return NextResponse.json({ message: 'Slug already used' }, { status: 409 })

    const created = await (prisma as any).blogPost.create({
      data: {
        title: title.trim(),
        slug: slug!,
        excerpt: excerpt?.trim() || null,
        content: content.trim(),
        coverImageUrl: coverImageUrl?.trim() || null,
        tags,
        status,
        authorId: session.user.id,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      },
      select: { id: true, slug: true }
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    console.error('[ADMIN_BLOG_POST]', e)
    return NextResponse.json({ message: 'Error' }, { status: 500 })
  }
}
