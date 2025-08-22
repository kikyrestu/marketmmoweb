import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getPosts() {
  return (prisma as any).blogPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    select: { id: true, title: true, slug: true, excerpt: true, coverImageUrl: true, publishedAt: true, tags: true }
  })
}

export default async function BlogIndexPage() {
  const posts = await getPosts()
  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((p: any) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="border rounded-lg overflow-hidden hover:shadow transition">
            {p.coverImageUrl && (
              <div className="relative h-40 w-full">
                <Image src={p.coverImageUrl} alt={p.title} fill sizes="400px" className="object-cover" unoptimized />
              </div>
            )}
            <div className="p-4">
              <h2 className="font-semibold text-lg">{p.title}</h2>
              {p.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : ''}</span>
                <span className="inline-flex gap-1 flex-wrap">
                  {(p.tags || []).slice(0,3).map((t: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 border rounded">{t}</span>
                  ))}
                </span>
              </div>
            </div>
          </Link>
        ))}
        {posts.length === 0 && (
          <div className="col-span-full text-sm text-muted-foreground">Belum ada artikel.</div>
        )}
      </div>
    </div>
  )
}
