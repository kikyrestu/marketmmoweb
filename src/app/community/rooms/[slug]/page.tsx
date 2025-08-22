"use client"
import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useChatRealtime } from '@/components/chat-realtime-provider'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface CMsg { id: string; body: string; createdAt: string; senderId: string; senderName: string; replyToId?: string | null; replyPreview?: { id: string; body: string; senderName: string } | null; imageUrl?: string | null; roomSlug?: string | null }

export default function CommunityRoomPage() {
  const { slug } = useParams<{ slug: string }>()
  const { registerCommunityHandler, connected } = useChatRealtime() as any
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id as string | undefined
  const [messages, setMessages] = useState<CMsg[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [replyTarget, setReplyTarget] = useState<CMsg | null>(null)
  const [listings, setListings] = useState<any[]>([])
  const [postListingItemId, setPostListingItemId] = useState<string>('')
  const [myItems, setMyItems] = useState<any[]>([])

  const scrollToBottom = (smooth=true) => bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })

  const merge = useCallback((cur: CMsg[], incoming: CMsg | CMsg[], mode: 'append' | 'prepend' = 'append') => {
    const arr = Array.isArray(incoming) ? incoming : [incoming]
    const map = new Map<string, CMsg>()
    for (const m of cur) map.set(m.id, m)
    for (const m of arr) map.set(m.id, m)
    const sorted = Array.from(map.values()).sort((a,b)=> new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return sorted
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/community/messages?room=${slug}`)
        if (!res.ok) throw new Error('fail')
        const data = await res.json()
        setMessages(data.messages)
        setNextCursor(data.nextCursor)
      } catch (e) {
      } finally { setLoading(false); setTimeout(()=>scrollToBottom(false), 80) }
    }
    load()
  }, [slug])

  useEffect(() => {
    const loadListings = async () => {
      try {
        const res = await fetch(`/api/community/rooms/${slug}/listings`)
        if (!res.ok) return
        const data = await res.json()
        setListings(data.listings || [])
      } catch {}
    }
    loadListings()
  }, [slug])

  useEffect(() => {
    // Fetch current seller's items for picker when eligible
    const loadMyItems = async () => {
      try {
        if (session?.user?.role !== 'SELLER') return
        const res = await fetch('/api/seller/items')
        if (!res.ok) return
        const items = await res.json()
        // Only available items
        setMyItems((items || []).filter((it: any) => it.isAvailable))
      } catch {}
    }
    loadMyItems()
  }, [session?.user?.role])

  useEffect(() => {
    registerCommunityHandler((ev: any) => {
      if (ev.message.roomSlug === slug) {
        setMessages(prev => merge(prev, { id: ev.message.id, body: ev.message.body, createdAt: ev.message.createdAt, senderId: ev.message.senderId, senderName: ev.message.senderName, replyToId: ev.message.replyToId, replyPreview: ev.message.replyPreview, imageUrl: ev.message.imageUrl, roomSlug: ev.message.roomSlug }))
        scrollToBottom()
      }
    })
  }, [registerCommunityHandler, merge, slug])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/community/messages?room=${slug}&cursor=${nextCursor}`)
      if (!res.ok) throw new Error('fail')
      const data = await res.json()
      setMessages(prev => merge(data.messages, prev, 'prepend'))
      setNextCursor(data.nextCursor)
    } finally { setLoadingMore(false) }
  }

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const send = async () => {
    if (!currentUserId) return
    if ((!input.trim() && !imageFile) || sending) return
    setSending(true)
    setErrorMsg(null)
    const body = input.trim()
    try {
      let res: Response
      if (imageFile) {
        const form = new FormData()
        if (body) form.append('body', body)
        if (replyTarget?.id) form.append('replyToId', replyTarget.id)
        form.append('room', slug)
        form.append('image', imageFile)
        res = await fetch('/api/community/messages', { method: 'POST', body: form })
      } else {
        res = await fetch('/api/community/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, replyToId: replyTarget?.id, room: slug }) })
      }
      if (!res.ok) {
        let serverMsg = 'Failed'
        try { serverMsg = (await res.json()).message || serverMsg } catch {}
        throw new Error(serverMsg)
      }
      const msg = await res.json()
      setMessages(prev => merge(prev, { ...msg, createdAt: msg.createdAt, roomSlug: slug }))
      setInput('')
      setReplyTarget(null)
      setImageFile(null)
      setImagePreview(null)
      scrollToBottom()
    } catch (e: any) {
      setErrorMsg(e.message || 'Error sending message')
    } finally { setSending(false) }
  }

  if (loading) return <div className='p-6'>Loading...</div>

  return (
    <div className='container max-w-4xl py-8'>
      <Card className='p-4 mb-4 flex items-center justify-between'>
        <h1 className='text-lg font-semibold'>Room: {slug}</h1>
        <span className={`text-xs px-2 py-1 rounded ${connected ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>{connected ? 'Live' : 'Offline'}</span>
      </Card>
      {/* Listings section */}
      <Card className='p-4 mb-4'>
        <div className='flex items-center justify-between mb-3'>
          <h2 className='font-semibold'>Listings</h2>
          {session?.user?.role === 'SELLER' && (
            <div className='flex gap-2 items-center'>
              <Select value={postListingItemId} onValueChange={setPostListingItemId}>
                <SelectTrigger className='w-64'>
                  <SelectValue placeholder='Pilih item kamu' />
                </SelectTrigger>
                <SelectContent>
                  {myItems.length === 0 && (
                    <SelectItem value='__none' disabled>Tidak ada item tersedia</SelectItem>
                  )}
                  {myItems.map((it:any)=> (
                    <SelectItem key={it.id} value={it.id}>{it.name} — Rp {(it.price||0).toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!postListingItemId || postListingItemId === '__none'}
                onClick={async ()=>{
                  if (!postListingItemId) return
                  const res = await fetch(`/api/community/rooms/${slug}/listings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemId: postListingItemId }) })
                  if (res.ok) {
                    setPostListingItemId('')
                    const data = await fetch(`/api/community/rooms/${slug}/listings`).then(r=>r.json())
                    setListings(data.listings || [])
                  }
                }}
              >Post</Button>
            </div>
          )}
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {listings.map((l:any)=> (
            <div key={l.id} className='border rounded p-3 text-sm'>
              {l.item?.imageUrl && (
                <div className='relative w-full h-28 mb-2'>
                  <Image src={l.item.imageUrl} alt={l.item.name} fill className='object-cover rounded' unoptimized />
                </div>
              )}
              <div className='font-medium'>{l.item?.name}</div>
              <div className='text-xs text-muted-foreground mb-2'>Rp {(l.item?.price ?? 0).toLocaleString()} · {l.status}</div>
              <div className='flex justify-between items-center'>
                <Link href={`/items/${l.item?.id}`} className='underline text-xs'>Detail</Link>
                <form method='post' action='/api/chats/start' onSubmit={(e)=>{ e.preventDefault(); fetch('/api/chats/start',{ method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ itemId: l.item?.id }) }).then(async r=>{ if(r.ok){ const d = await r.json(); window.location.href = `/conversations/${d.conversationId}` } }) }}>
                  <Button type='submit' size='sm' variant='outline'>Chat Seller</Button>
                </form>
              </div>
              {currentUserId && l.sellerId === currentUserId && (
                <div className='flex gap-2 mt-2'>
                  <Button size='sm' variant='secondary' onClick={async ()=>{
                    const r = await fetch(`/api/community/rooms/${slug}/listings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id, status: 'ARCHIVED' }) })
                    if (r.ok) {
                      const data = await fetch(`/api/community/rooms/${slug}/listings`).then(r=>r.json())
                      setListings(data.listings || [])
                    }
                  }}>Archive</Button>
                  <Button size='sm' variant='secondary' onClick={async ()=>{
                    const r = await fetch(`/api/community/rooms/${slug}/listings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id, status: 'SOLD' }) })
                    if (r.ok) {
                      const data = await fetch(`/api/community/rooms/${slug}/listings`).then(r=>r.json())
                      setListings(data.listings || [])
                    }
                  }}>Mark Sold</Button>
                  <Button size='sm' variant='destructive' onClick={async ()=>{
                    const r = await fetch(`/api/community/rooms/${slug}/listings`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id }) })
                    if (r.ok) {
                      setListings(prev => prev.filter(x=> x.id !== l.id))
                    }
                  }}>Delete</Button>
                </div>
              )}
            </div>
          ))}
          {listings.length === 0 && <div className='text-xs text-muted-foreground'>Belum ada listing di room ini.</div>}
        </div>
      </Card>
      <Card className='p-0 overflow-hidden'>
        <div className='h-[60vh] overflow-y-auto flex flex-col gap-2 p-4'>
          {nextCursor && (
            <div className='flex justify-center mb-2'>
              <Button variant='outline' size='sm' disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading...' : 'Load older'}</Button>
            </div>
          )}
          {messages.map(m => {
            const isMine = currentUserId && m.senderId === currentUserId
            return (
              <div key={m.id} className={`group flex items-start gap-2 ${isMine ? 'justify-end' : ''}`}> 
                <div className={`flex-1 min-w-0 max-w-[78%] ${isMine ? 'flex justify-end' : ''}`}> 
                  <div className={`flex ${isMine ? 'justify-end text-right' : 'items-baseline'} gap-2 flex-wrap`}> 
                    {!isMine && <span className='text-xs font-semibold'>{m.senderName || 'User'}</span>}
                    {isMine && <span className='text-xs font-semibold text-primary'>You</span>}
                    <span className='text-[10px] text-muted-foreground'>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button onClick={()=> setReplyTarget(m)} className={`opacity-0 group-hover:opacity-100 text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-primary/10 transition ${isMine ? 'order-first' : ''}`}>Reply</button>
                  </div>
                  {m.replyPreview && (
                    <div className={`mb-1 pl-2 border-l text-[11px] text-muted-foreground line-clamp-1 ${isMine ? 'text-right border-l-0 border-r pr-2' : ''}`}>↪ {m.replyPreview.senderName}: {m.replyPreview.body}</div>
                  )}
                  <div className={`inline-block rounded px-3 py-2 text-sm whitespace-pre-wrap break-words shadow-sm space-y-2 ${isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                    {m.body}
                    {m.imageUrl && (
                      <a href={m.imageUrl} target='_blank' rel='noopener noreferrer' className='block'>
                        <div className='relative w-full max-h-64 h-64'>
                          <Image src={m.imageUrl} alt='attachment' fill className='object-contain rounded border' unoptimized />
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        <div className='border-t p-3 space-y-2'>
          {replyTarget && (
            <div className='flex items-start gap-2 text-xs bg-muted/50 rounded p-2'>
              <div className='flex-1'>Replying to <span className='font-medium'>{replyTarget.senderName}</span>: <span className='italic'>{replyTarget.body.slice(0,80)}{replyTarget.body.length>80?'…':''}</span></div>
              <button className='text-muted-foreground hover:text-foreground' onClick={()=> setReplyTarget(null)}>✕</button>
            </div>
          )}
      {imagePreview && (
            <div className='flex items-center gap-2 text-xs bg-muted/40 p-2 rounded'>
        {/* Preview from blob/object URL: keep img; add alt and disable lint rule */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagePreview} alt='preview' className='h-10 w-10 object-cover rounded border' />
              <span className='flex-1 truncate'>{imageFile?.name}</span>
              <button onClick={()=> { setImageFile(null); setImagePreview(null) }} className='text-muted-foreground hover:text-foreground'>✕</button>
            </div>
          )}
          <div className='flex gap-2 items-start'>
            <div className='flex flex-col gap-2 flex-1'>
              <Input value={input} disabled={!currentUserId} onChange={e=>setInput(e.target.value)} placeholder={currentUserId ? (replyTarget ? 'Balas pesan...' : 'Ketik pesan...') : 'Login untuk mengirim'} onKeyDown={e=>{ if(currentUserId && e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }} />
              <div className='flex gap-2'>
                <label className={`text-xs px-2 py-1 border rounded cursor-pointer ${currentUserId ? 'hover:bg-muted' : 'opacity-50 cursor-not-allowed'}`}>
                  Upload Gambar
                  <input type='file' accept='image/*' className='hidden' disabled={!currentUserId} onChange={e=> {
                    const file = e.target.files?.[0]
                    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)) }
                  }} />
                </label>
              </div>
              {errorMsg && <div className='text-[11px] text-red-500'>{errorMsg}</div>}
            </div>
            <Button disabled={!currentUserId || sending || (!input.trim() && !imageFile)} onClick={send}>{currentUserId ? (sending ? 'Mengirim...' : 'Kirim') : 'Login dulu'}</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
