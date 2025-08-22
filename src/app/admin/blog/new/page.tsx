import { headers as nextHeaders, cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function createPost(formData: FormData) {
  'use server'
  const h = await nextHeaders()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const base = `${proto}://${host}`
  const ck = await cookies()
  const cookieHeader = ck.getAll().map(c => `${c.name}=${c.value}`).join('; ')
  const res = await fetch(`${base}/api/admin/blog`, {
    method: 'POST',
    headers: { cookie: cookieHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: formData.get('title'),
      slug: formData.get('slug'),
      excerpt: formData.get('excerpt'),
      content: formData.get('content'),
      coverImageUrl: formData.get('coverImageUrl'),
      tags: (formData.get('tags') as string)?.split(',').map(t=>t.trim()).filter(Boolean) || [],
      status: formData.get('status') || 'DRAFT',
    })
  })
  if (!res.ok) {
    const j = await res.json().catch(()=>({}))
    throw new Error(j.message || 'Failed to create post')
  }
  // On success, go back to list
  redirect('/admin/blog')
}

export default async function AdminBlogNewPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/dashboard')
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New Blog Post</h1>
        <p className="text-sm text-muted-foreground">Create and publish an article</p>
      </div>
      <form action={createPost} className="space-y-4 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input name="title" required className="w-full rounded border px-3 py-2 bg-background" />
          </div>
          <div>
            <label className="block text-sm mb-1">Slug</label>
            <input name="slug" placeholder="auto from title" className="w-full rounded border px-3 py-2 bg-background" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Excerpt</label>
          <textarea name="excerpt" rows={2} className="w-full rounded border px-3 py-2 bg-background" />
        </div>
        <div>
          <label className="block text-sm mb-1">Content (Markdown or HTML)</label>
          <textarea name="content" required rows={10} className="w-full rounded border px-3 py-2 bg-background font-mono" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Cover Image URL</label>
            <input name="coverImageUrl" placeholder="/uploads/.. or https://.." className="w-full rounded border px-3 py-2 bg-background" />
            <p className="text-xs text-muted-foreground mt-1">Upload via Storage page first, then paste URL here.</p>
          </div>
          <div>
            <label className="block text-sm mb-1">Tags (comma separated)</label>
            <input name="tags" placeholder="news, update" className="w-full rounded border px-3 py-2 bg-background" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Status</label>
          <select name="status" className="rounded border px-3 py-2 bg-background">
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <button className="px-3 py-2 rounded-md border hover:bg-accent">Create</button>
      </form>
    </div>
  )
}
