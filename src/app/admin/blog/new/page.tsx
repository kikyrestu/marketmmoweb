import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EditorLoader } from './editor-loader'

export default async function AdminBlogNewPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/dashboard')
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New Blog Post</h1>
        <p className="text-sm text-muted-foreground">Create and publish an article</p>
      </div>
      <EditorLoader />
    </div>
  )
}
