import Link from 'next/link'
import { cookies, headers as nextHeaders } from 'next/headers'

export const dynamic = 'force-dynamic'

async function fetchPosts() {
  const h = await nextHeaders()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const base = `${proto}://${host}`
  const ck = await cookies()
  const cookieHeader = ck.getAll().map(c => `${c.name}=${c.value}`).join('; ')
  const res = await fetch(`${base}/api/admin/blog`, { headers: { cookie: cookieHeader } })
  if (!res.ok) throw new Error('Failed to load posts')
  return res.json()
}

export default async function AdminBlogListPage() {
  const posts: Array<{ id: string; title: string; slug: string; status: string; updatedAt: string }> = await fetchPosts()
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Blog Posts</h1>
          <p className="text-sm text-muted-foreground">Manage your articles</p>
        </div>
        <Link href="/admin/blog/new" className="px-3 py-2 rounded-md border hover:bg-accent">New Post</Link>
      </div>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-accent">
            <tr className="text-left">
              <th className="p-2">Title</th>
              <th className="p-2">Slug</th>
              <th className="p-2">Status</th>
              <th className="p-2">Updated</th>
              <th className="p-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.title}</td>
                <td className="p-2 text-muted-foreground">{p.slug}</td>
                <td className="p-2"><span className="inline-flex items-center rounded px-2 py-1 border text-[10px]">{p.status}</span></td>
                <td className="p-2 text-muted-foreground">{new Date(p.updatedAt).toLocaleString()}</td>
                <td className="p-2">
                  <Link href={`/blog/${p.slug}`} className="underline" target="_blank">View</Link>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={5}>No posts yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
