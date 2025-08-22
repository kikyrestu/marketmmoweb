import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { chatHub } from '@/lib/chatHub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return new Response('Unauthorized', { status: 401 })

  let client: ReturnType<typeof chatHub.subscribe> | null = null
  const stream = new ReadableStream({
    start(controller) {
      client = chatHub.subscribe(userId, controller)
      // Close on client abort (browser navigates away)
      try { (request as any).signal?.addEventListener?.('abort', () => client?.close()) } catch {}
    },
    cancel() { try { client?.close() } catch {} }
  })

  return new Response(stream, {
    headers: {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
      'Vary': 'Accept-Encoding',
  // Hint proxies/NGINX not to buffer SSE
  'X-Accel-Buffering': 'no'
    }
  })
}
