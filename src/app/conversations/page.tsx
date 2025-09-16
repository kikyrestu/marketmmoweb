"use client"
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { useChatRealtime } from '@/components/chat-realtime-provider'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ConversationRow {
  id: string
  item: { id: string; name: string; imageUrl: string | null; price: number }
  otherUser: { id: string; name: string } | null
  lastMessage: { id: string; body: string; createdAt: string; senderId: string } | null
  unreadCount: number
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [skeleton, setSkeleton] = useState(true)
  const { conversationUpdates } = useChatRealtime()

  useEffect(() => {
    setSkeleton(true)
    const load = async () => {
      try {
        const res = await fetch('/api/chats') // ganti ke list baru nanti jika dipisah
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setConversations(data)
      } catch {
        toast.error('Gagal memuat daftar percakapan')
      } finally {
        setLoading(false)
        setTimeout(() => setSkeleton(false), 500)
      }
    }
    load()
  }, [])

  // merge realtime updates
  useEffect(() => {
    if (!conversations.length) return
    setConversations(prev => prev.map(c => {
      const upd = conversationUpdates[c.id]
      if (!upd) return c
      return {
        ...c,
        lastMessage: upd.lastMessage ? upd.lastMessage : c.lastMessage,
        unreadCount: upd.unreadCount ?? c.unreadCount
      }
    }))
  }, [conversationUpdates])

  if (loading) return <div className='container py-10 flex justify-center'><LoadingSpinner /></div>

  return (
    <div className='container py-10 max-w-2xl'>
      <h1 className='text-2xl font-bold mb-6'>Conversations</h1>
      {skeleton ? (
        <div className='space-y-3'>
          {[...Array(5)].map((_,i)=>(
            <Card key={i} className='p-4 flex justify-between animate-pulse bg-muted/50'>
              <div className='w-2/3 h-4 bg-muted rounded'></div>
              <div className='w-10 h-4 bg-muted rounded'></div>
            </Card>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <Card className='p-6 text-center text-muted-foreground'>Belum ada percakapan.<br/>Mulai transaksi atau chat dengan user lain untuk memulai percakapan.</Card>
      ) : (
        <div className='space-y-3'>
          {conversations.map(c => (
            <Link key={c.id} href={`/conversations/${c.id}`} aria-label={`Buka percakapan dengan ${c.otherUser?.name || 'Unknown'}`}>
              <Card className='p-4 flex justify-between hover:bg-muted/50 transition-colors'>
                <div>
                  <p className='font-medium'>{c.otherUser?.name || 'Unknown'}</p>
                  <p className='text-xs text-muted-foreground line-clamp-1'>{c.lastMessage?.body}</p>
                  <p className='text-[10px] text-muted-foreground mt-1'>
                    {c.item.name === 'Direct Message' ? `Direct Message` : c.item.name}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <div className='bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full h-fit' aria-label='Jumlah pesan belum dibaca'>{c.unreadCount}</div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
