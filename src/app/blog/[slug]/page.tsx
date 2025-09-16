import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getPost(slug: string) {
  return (prisma as any).blogPost.findUnique({ where: { slug }, select: { id: true, title: true, slug: true, content: true, excerpt: true, coverImageUrl: true, publishedAt: true, tags: true, status: true } })
}

export default async function BlogDetailPage(props: any) {
  const { slug } = await props.params
  const post = await getPost(slug)
  if (!post || post.status !== 'PUBLISHED') return notFound()
  return (
    <article className="container mx-auto px-4 py-10 prose max-w-3xl">
      {post.coverImageUrl && (
        <div className="relative w-full h-64 mb-6 rounded-lg overflow-hidden">
          <Image src={post.coverImageUrl} alt={post.title} fill sizes="800px" className="object-cover" unoptimized />
        </div>
      )}
      <h1>{post.title}</h1>
      <p className="text-sm text-muted-foreground">
        {post.publishedAt ? new Date(post.publishedAt).toLocaleString() : ''}
      </p>
      {post.tags?.length ? (
        <div className="mt-2 flex gap-2 flex-wrap">
          {post.tags.map((t: string, i: number) => (
            <span key={i} className="px-2 py-0.5 border rounded text-xs">{t}</span>
          ))}
        </div>
      ) : null}
      <div className="mt-6" dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  )
}
