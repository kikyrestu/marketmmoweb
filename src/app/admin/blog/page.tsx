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
  let posts: Array<{ id: string; title: string; slug: string; status: string; updatedAt: string }> = [];
  let error = null;
  try {
    posts = await fetchPosts();
  } catch (e: any) {
    error = e.message || 'Failed to load posts';
  }
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Postingan Blog</h1>
          <p className="text-sm text-muted-foreground">Kelola artikel Anda</p>
        </div>
        <Link href="/admin/blog/new" className="px-3 py-2 rounded-md border hover:bg-accent" aria-label="Postingan Blog Baru">Postingan Baru</Link>
      </div>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm" aria-label="Blog Posts Table">
          <thead className="bg-accent">
            <tr className="text-left">
              <th className="p-2">Judul</th>
              <th className="p-2">Slug</th>
              <th className="p-2">Status</th>
              <th className="p-2">Diperbarui</th>
              <th className="p-2 w-24">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td className="p-6 text-center text-red-500" colSpan={5}>{error}</td>
              </tr>
            )}
            {!error && posts.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={5}>Belum ada artikel. Mulai dengan membuat postingan baru.</td>
              </tr>
            )}
            {!error && posts.length > 0 && posts.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-2">{p.title}</td>
                <td className="p-2 text-muted-foreground">{p.slug}</td>
                <td className="p-2"><span className="inline-flex items-center rounded px-2 py-1 border text-[10px]">{p.status}</span></td>
                <td className="p-2 text-muted-foreground">{new Date(p.updatedAt).toLocaleString()}</td>
                <td className="p-2 flex gap-2">
                  <Link href={`/blog/${p.slug}`} className="underline" target="_blank" aria-label={`View ${p.title}`}>View</Link>
                  <Link href={`/admin/blog/new?id=${p.id}`} className="underline text-blue-600" aria-label={`Edit ${p.title}`}>Edit</Link>
                  <BlogDeleteButton id={p.id} />
                  <BlogStatusButton id={p.id} status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Skeleton loading */}
        {!error && posts.length === 0 && (
          <div className="p-6 animate-pulse">
            <div className="h-6 bg-muted rounded w-1/2 mb-2" />
            <div className="h-4 bg-muted rounded w-1/3 mb-2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        )}
      </div>
    </div>
  )
}
import BlogDeleteButton from './BlogDeleteButton'
import BlogStatusButton from './BlogStatusButton'
