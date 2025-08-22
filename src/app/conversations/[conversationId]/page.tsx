"use client"
import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChatRealtime } from '@/components/chat-realtime-provider'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSession } from 'next-auth/react'

interface Msg { id: string; body: string; createdAt: string; senderId: string }
interface Offer { id: string; amount: number; status: 'SENT'|'COUNTER'|'ACCEPTED'|'REJECTED'|'EXPIRED'; createdAt: string; createdById: string }
interface Meta { id: string; item?: { id: string; name: string; imageUrl?: string | null; price: number }; otherUser?: { id: string; name: string } | null }

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id as string | undefined
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { registerMessageHandler } = useChatRealtime()
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [offerAmount, setOfferAmount] = useState('')
  const [counterAmount, setCounterAmount] = useState('')
  const [escrow, setEscrow] = useState<any>(null)
  const [startingEscrow, setStartingEscrow] = useState(false)

  const scrollToBottom = (smooth = true) => bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })

  const mergeUnique = useCallback((current: Msg[], incoming: Msg[] | Msg): Msg[] => {
    const arr = Array.isArray(incoming) ? incoming : [incoming]
    const map = new Map<string, Msg>()
    for (const m of current) map.set(m.id, m)
    for (const m of arr) if (!map.has(m.id)) map.set(m.id, m)
    return Array.from(map.values()).sort((a,b)=> new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime())
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/chats/${conversationId}/messages`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setMessages(data.messages)
        setNextCursor(data.nextCursor)
      } finally { setLoading(false); setTimeout(() => scrollToBottom(false), 50) }
    }
    load()
  }, [conversationId])

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch(`/api/chats/${conversationId}/meta`)
        if (res.ok) {
          const data = await res.json()
          setMeta(data)
        }
      } catch {}
    }
    fetchMeta()
  }, [conversationId])

  useEffect(() => {
    const loadOffers = async () => {
      try {
        const res = await fetch(`/api/offers?conversationId=${conversationId}`)
        if (res.ok) setOffers(await res.json())
      } catch {}
    }
    loadOffers()
  }, [conversationId])

  useEffect(() => {
    const loadEscrow = async () => {
      try {
        const res = await fetch(`/api/escrow?conversationId=${conversationId}`)
        if (res.ok) setEscrow(await res.json())
      } catch {}
    }
    loadEscrow()
  }, [conversationId])

  useEffect(() => {
    registerMessageHandler(ev => {
      if (ev.conversationId !== conversationId) return
      setMessages(prev => mergeUnique(prev, { id: ev.message.id, body: ev.message.body, createdAt: ev.message.createdAt, senderId: ev.message.senderId }))
      scrollToBottom()
    })
  }, [conversationId, registerMessageHandler, mergeUnique])

  const send = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const body = input.trim()
    try {
      const res = await fetch(`/api/chats/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      })
      if (!res.ok) throw new Error('Failed')
      const msg = await res.json()
      setMessages(prev => mergeUnique(prev, msg))
      setInput('')
      scrollToBottom()
      fetch(`/api/chats/${conversationId}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lastMessageId: msg.id }) })
    } finally { setSending(false) }
  }

  const sendOffer = async () => {
    const amt = parseInt(offerAmount.replace(/[^0-9]/g,''), 10)
    if (!amt || !meta?.item) return
    try {
      const res = await fetch('/api/offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, itemId: meta.item.id, amount: amt }) })
      if (res.ok) {
        const o = await res.json(); setOffers(prev => [...prev, o]); setOfferAmount('')
      }
    } catch {}
  }

  const actOnOffer = async (id: string, status: 'ACCEPTED'|'REJECTED'|'COUNTER', amount?: number) => {
    try {
      const res = await fetch(`/api/offers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, amount }) })
      if (res.ok) {
        const updated = await res.json()
        if (status === 'COUNTER') setOffers(prev => [...prev, updated])
        else setOffers(prev => prev.map(o => o.id === id ? { ...o, status } : o))
      }
    } catch {}
  }

  const startEscrow = async () => {
    if (startingEscrow) return
    setStartingEscrow(true)
    try {
      const res = await fetch('/api/escrow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId }) })
      if (res.ok) setEscrow(await res.json())
    } finally { setStartingEscrow(false) }
  }

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/chats/${conversationId}/messages?cursor=${nextCursor}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMessages(prev => mergeUnique(data.messages as Msg[], prev))
      setNextCursor(data.nextCursor)
    } finally { setLoadingMore(false) }
  }

  if (loading) return <div className='container py-10 flex justify-center'><LoadingSpinner /></div>

  return (
    <div className='container max-w-2xl py-10'>
      <Card className='p-4 mb-4 flex items-center justify-between'>
        <Button variant='ghost' size='sm' onClick={() => router.push('/conversations')}>Back</Button>
        <p className='text-sm text-muted-foreground'>Conversation</p>
      </Card>
      {meta?.item && (
        <Card className='mb-4 p-4 flex gap-4 items-center'>
          {meta.item.imageUrl && (
            <div className='relative w-16 h-16'>
              <Image src={meta.item.imageUrl} alt={meta.item.name} fill sizes="64px" className='object-cover rounded border' unoptimized />
            </div>
          )}
          <div className='flex-1'>
            <p className='font-medium text-sm'>{meta.item.name}</p>
            <p className='text-xs text-muted-foreground'>Rp {meta.item.price.toLocaleString()}</p>
            {meta.otherUser && <p className='text-[11px] text-muted-foreground mt-1'>With: {meta.otherUser.name}</p>}
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={() => { if (meta?.item?.id) router.push(`/items/${meta.item.id}`) }}
            disabled={!meta?.item?.id}
          >
            View
          </Button>
        </Card>
      )}
      <Card className='mb-4 p-4'>
        <p className='font-medium mb-2 text-sm'>Offers</p>
        <div className='space-y-2 mb-3'>
          {offers.length === 0 && <p className='text-xs text-muted-foreground'>Belum ada offer</p>}
          {offers.map(o => (
            <div key={o.id} className='flex items-center justify-between text-sm border rounded px-2 py-1'>
              <span>Rp {o.amount.toLocaleString()} <span className='text-[10px] text-muted-foreground ml-2'>{o.status}</span></span>
              <div className='flex gap-2'>
                {o.status === 'SENT' || o.status === 'COUNTER' ? (
                  <>
                    <Button size='sm' variant='outline' onClick={() => actOnOffer(o.id, 'ACCEPTED')}>Accept</Button>
                    <Button size='sm' variant='outline' onClick={() => actOnOffer(o.id, 'REJECTED')}>Reject</Button>
                    <div className='flex items-center gap-1'>
                      <Input value={counterAmount} onChange={e=>setCounterAmount(e.target.value)} placeholder='Counter' className='h-8 w-24' />
                      <Button size='sm' variant='secondary' onClick={() => { const a = parseInt(counterAmount.replace(/[^0-9]/g,''),10); if(a){ actOnOffer(o.id,'COUNTER', a); setCounterAmount('') } }}>Counter</Button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className='flex gap-2'>
          <Input value={offerAmount} onChange={e=>setOfferAmount(e.target.value)} placeholder='Tawar harga (Rp)' className='w-40' />
          <Button onClick={sendOffer} disabled={!offerAmount.trim() || !meta?.item}>Kirim Offer</Button>
        </div>
      </Card>
      <Card className='mb-4 p-4'>
        <p className='font-medium mb-2 text-sm'>Escrow</p>
        {escrow ? (
          <div className='text-sm'>
            <p>Status: <span className='font-mono'>{escrow.status}</span></p>
            <p>Amount: Rp {escrow.totalAmount?.toLocaleString()}</p>
          </div>
        ) : (
          <div className='flex items-center gap-2'>
            <Button disabled={startingEscrow} onClick={startEscrow}>Start Escrow</Button>
            <p className='text-xs text-muted-foreground'>Bikin escrow room (admin bisa join nanti)</p>
          </div>
        )}
      </Card>
      <div className='mb-4 max-h-[60vh] overflow-y-auto space-y-3 border rounded p-4'>
        {nextCursor && (
          <div className='flex justify-center mb-2'>
            <Button size='sm' variant='outline' disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading...' : 'Load older'}</Button>
          </div>
        )}
        {messages.map(m => {
          const isMine = currentUserId && m.senderId === currentUserId
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-3 py-2 rounded-lg max-w-[80%] shadow-sm whitespace-pre-wrap break-words text-sm leading-snug 
                ${isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}> 
                <p>{m.body}</p>
                <p className={`text-[10px] mt-1 opacity-70 ${isMine ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <Card className='p-3'>
        <div className='flex gap-2'>
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder='Type a message...' onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }} />
          <Button disabled={sending || !input.trim()} onClick={send}>Send</Button>
        </div>
      </Card>
    </div>
  )
}
