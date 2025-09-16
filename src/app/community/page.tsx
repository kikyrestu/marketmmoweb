"use client"
import { useEffect, useRef, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useChatRealtime } from '@/components/chat-realtime-provider'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSession } from 'next-auth/react'
import Image from 'next/image'

interface CMsg { id: string; body: string; createdAt: string; senderId: string; senderName: string; replyToId?: string | null; replyPreview?: { id: string; body: string; senderName: string } | null; imageUrl?: string | null }

function RoomList() {
  const [rooms, setRooms] = useState<any[]>([])
  useEffect(() => { fetch('/api/community/rooms').then(r=>r.json()).then(setRooms).catch(()=>{}) }, [])
  return (
    <Card className='p-3 mb-4'>
      <div className='text-sm font-medium flex items-center gap-2'>
        Rooms <span className='text-[10px] px-1 py-0.5 border rounded'>{rooms.length}</span>
      </div>
      <div className='mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {rooms.length === 0 && (
          <div className='text-xs text-muted-foreground'>Belum ada room.</div>
        )}
        {rooms.map(r => (
          <a key={r.id} href={`/community/rooms/${r.slug}`} className='border rounded p-3 flex items-center gap-3 hover:bg-accent transition text-xs'>
            <div className='relative h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0'>
              <Image src={r.imageUrl || '/window.svg'} alt={r.name} fill sizes='48px' className='object-cover' />
            </div>
            <div className='min-w-0 flex-1'>
              <div className='font-semibold text-sm truncate'>{r.name}</div>
              <div className='flex gap-2 flex-wrap text-[10px] text-muted-foreground mt-1'>
                {r.gameName && <span className='truncate'>{r.gameName}</span>}
                {r.tags?.slice(0,3).map((t:string, idx: number)=> <span key={`${t}-${idx}`} className='px-1 py-0.5 bg-muted rounded'>{t}</span>)}
              </div>
              <div className='mt-1 flex gap-2 text-[10px]'>
                <span className='px-1.5 py-0.5 rounded bg-muted'>👥 {r._count?.members ?? 0}</span>
                <span className='px-1.5 py-0.5 rounded bg-muted'>💬 {r._count?.messages ?? 0}</span>
                {r.isTradable && <span className='px-1.5 py-0.5 rounded bg-amber-200 text-amber-900'>🔁 Tradable</span>}
              </div>
            </div>
          </a>
        ))}
      </div>
    </Card>
  )
}

export default function CommunityPage() {
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
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

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
        const res = await fetch('/api/community/messages')
        if (!res.ok) throw new Error('fail')
        const data = await res.json()
        setMessages(data.messages)
        setNextCursor(data.nextCursor)
      } catch (e) {
        // show empty gracefully
      } finally { setLoading(false); setTimeout(()=>scrollToBottom(false), 80) }
    }
    load()
  }, [])

  useEffect(() => {
    registerCommunityHandler((ev: any) => {
      setMessages(prev => merge(prev, { id: ev.message.id, body: ev.message.body, createdAt: ev.message.createdAt, senderId: ev.message.senderId, senderName: ev.message.senderName, replyToId: ev.message.replyToId, replyPreview: ev.message.replyPreview, imageUrl: ev.message.imageUrl }))
      scrollToBottom()
    })
  }, [registerCommunityHandler, merge])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/community/messages?cursor=${nextCursor}`)
      if (!res.ok) throw new Error('fail')
      const data = await res.json()
      setMessages(prev => merge(data.messages, prev, 'prepend'))
      setNextCursor(data.nextCursor)
    } finally { setLoadingMore(false) }
  }

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const send = async () => {
    if (!currentUserId) {
      import('sonner').then(({ toast }) => toast.error('Login dulu untuk mengirim pesan!'));
      return;
    }
    if (( !input.trim() && !imageFile) || sending) return;
    setSending(true);
    setErrorMsg(null);
    const body = input.trim();
    try {
      let res: Response;
      if (imageFile) {
        const form = new FormData();
        if (body) form.append('body', body);
        if (replyTarget?.id) form.append('replyToId', replyTarget.id);
        form.append('image', imageFile);
        res = await fetch('/api/community/messages', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/community/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, replyToId: replyTarget?.id }) });
      }
      if (!res.ok) {
        let serverMsg = 'Failed';
        try { serverMsg = (await res.json()).message || serverMsg } catch {}
        import('sonner').then(({ toast }) => toast.error(serverMsg));
        throw new Error(serverMsg);
      }
      const msg = await res.json();
      setMessages(prev => merge(prev, { ...msg, createdAt: msg.createdAt })); // SSE duplicate safe
      setInput('');
      setReplyTarget(null);
      setImageFile(null);
      setImagePreview(null);
      scrollToBottom();
      import('sonner').then(({ toast }) => toast.success('Pesan terkirim!'));
    } catch (e: any) {
      setErrorMsg(e.message || 'Error sending message');
    } finally { setSending(false); }
  };

  useEffect(() => {
    if (!profileUserId) return
    setProfileLoading(true)
    setProfileData(null)
    fetch(`/api/users/${profileUserId}`).then(async r => {
      if (r.ok) { setProfileData(await r.json()) }
    }).finally(()=> setProfileLoading(false))
  }, [profileUserId])

  if (loading) return (
    <div className='container py-10 flex justify-center'>
      <div className="w-full animate-pulse">
        <div className="h-6 bg-muted rounded w-1/2 mb-2" />
        <div className="h-4 bg-muted rounded w-1/3 mb-2" />
        <div className="h-32 bg-muted rounded" />
        <div className="h-32 bg-muted rounded mt-2" />
      </div>
    </div>
  );

  return (
    <div className='container max-w-3xl py-8'>
      <RoomList />
      <Card className='p-4 mb-4 flex items-center justify-between'>
        <h1 className='text-lg font-semibold'>Community Chat</h1>
        <span className={`text-xs px-2 py-1 rounded ${connected ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>{connected ? 'Live' : 'Offline'}</span>
      </Card>
      <Card className='p-0 overflow-hidden'>
        <div ref={listRef} className='h-[60vh] overflow-y-auto flex flex-col gap-2 p-4'>
          {nextCursor && (
            <div className='flex justify-center mb-2'>
              <Button variant='outline' size='sm' disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading...' : 'Load older'}</Button>
            </div>
          )}
          {messages.map(m => {
            const isMine = currentUserId && m.senderId === currentUserId
            return (
              <div key={m.id} className={`group flex items-start gap-2 ${isMine ? 'justify-end' : ''}`}> 
                {!isMine && (
                  <button onClick={()=> setProfileUserId(m.senderId)} className='w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-[11px] font-medium uppercase hover:bg-primary/20 transition'>
                    {(m.senderName||'?').slice(0,2)}
                  </button>
                )}
                <div className={`flex-1 min-w-0 max-w-[78%] ${isMine ? 'flex justify-end' : ''}`}> 
                  <div className={`flex ${isMine ? 'justify-end text-right' : 'items-baseline'} gap-2 flex-wrap`}> 
                    {!isMine && <button onClick={()=> setProfileUserId(m.senderId)} className='text-xs font-semibold hover:underline'>{m.senderName || 'User'}</button>}
                    {isMine && <span className='text-xs font-semibold text-primary'>You</span>}
                    <span className='text-[10px] text-muted-foreground'>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button onClick={()=> setReplyTarget(m)} className={`opacity-0 group-hover:opacity-100 text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-primary/10 transition ${isMine ? 'order-first' : ''}`}>Reply</button>
                  </div>
                  {m.replyPreview && (
                    <div className={`mb-1 pl-2 border-l text-[11px] text-muted-foreground line-clamp-1 cursor-pointer hover:text-foreground ${isMine ? 'text-right border-l-0 border-r pr-2' : ''}`} onClick={()=> {
                      const anchor = document.getElementById(`msg-${m.replyPreview!.id}`)
                      if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}>↪ {m.replyPreview.senderName}: {m.replyPreview.body}</div>
                  )}
                  <div id={`msg-${m.id}`} className={`inline-block rounded px-3 py-2 text-sm whitespace-pre-wrap break-words shadow-sm space-y-2 ${isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                    {m.body}
                    {m.imageUrl && (
                      <a href={m.imageUrl} target='_blank' rel='noopener noreferrer' className='block group/image'>
                        <div className='relative w-full max-h-64 h-64'>
                          <Image src={m.imageUrl} alt='attachment' fill unoptimized className='object-contain rounded border' />
                        </div>
                      </a>
                    )}
                  </div>
                </div>
                {isMine && (
                  <button onClick={()=> setProfileUserId(m.senderId)} className='w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-[11px] font-medium uppercase hover:bg-primary/20 transition'>
                    {(m.senderName||'?').slice(0,2)}
                  </button>
                )}
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
              <div className='relative h-10 w-10'>
                <Image src={imagePreview} alt='preview' fill unoptimized className='object-cover rounded border' />
              </div>
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
            <Button disabled={!currentUserId || sending || (!input.trim() && !imageFile)} onClick={send} aria-label="Send Message">{currentUserId ? (sending ? 'Mengirim...' : 'Kirim') : 'Login dulu'}</Button>
          </div>
        </div>
      </Card>
      <Dialog open={!!profileUserId} onOpenChange={(o)=> { if(!o) { setProfileUserId(null); setProfileData(null) } }}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>Informasi singkat anggota.</DialogDescription>
          </DialogHeader>
          {profileLoading && <p className='text-sm text-muted-foreground'>Loading...</p>}
          {!profileLoading && profileData && (
            <div className='space-y-2 text-sm'>
              <div className='font-medium text-lg'>{profileData.name}</div>
              <div className='flex gap-2 text-xs'><span className='px-2 py-0.5 rounded bg-muted'>{profileData.role}</span>{profileData.isVerified && <span className='px-2 py-0.5 rounded bg-green-500 text-white'>Verified</span>}</div>
              <div className='text-xs text-muted-foreground'>Joined {new Date(profileData.createdAt).toLocaleDateString()}</div>
            </div>
          )}
          {!profileLoading && !profileData && <p className='text-sm text-muted-foreground'>User not found.</p>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
