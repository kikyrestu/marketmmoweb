"use client"
import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChatRealtime } from '@/components/chat-realtime-provider'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useSession } from 'next-auth/react'

interface Msg { id: string; body: string; createdAt: string; senderId: string; sender?: { role?: string; name?: string }; imageUrl?: string | null }
interface Offer { id: string; amount: number; status: 'SENT'|'COUNTER'|'ACCEPTED'|'REJECTED'|'EXPIRED'; createdAt: string; createdById: string }
interface Meta { id: string; item?: { id: string; name: string; imageUrl?: string | null; price: number; seller?: { id: string; name: string } }; otherUser?: { id: string; name: string } | null; currentUserRole?: string; otherUserRole?: string }

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const currentUserId = session?.user?.id as string | undefined

  // All hooks must be called at the top level, before any conditional returns
  const [messages, setMessages] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [skeleton, setSkeleton] = useState(true)
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
  const [escrowRequest, setEscrowRequest] = useState<any>(null)
  const [requestingEscrow, setRequestingEscrow] = useState(false)
  const [respondingEscrow, setRespondingEscrow] = useState(false)
  const [confirmingEscrow, setConfirmingEscrow] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const notificationEsRef = useRef<EventSource | null>(null)

  const scrollToBottom = (smooth = true) => bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })

  const mergeUnique = useCallback((current: Msg[], incoming: Msg[] | Msg): Msg[] => {
    const arr = Array.isArray(incoming) ? incoming : [incoming]
    const map = new Map<string, Msg>()
    for (const m of current) map.set(m.id, m)
    for (const m of arr) if (!map.has(m.id)) map.set(m.id, m)
    return Array.from(map.values()).sort((a,b)=> new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime())
  }, [])

  // All useEffect hooks must be called at the top level, before any conditional returns
  useEffect(() => {
    setSkeleton(true)
    const load = async () => {
      try {
        const res = await fetch(`/api/chats/${conversationId}/messages`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setMessages(data.messages)
        setNextCursor(data.nextCursor)
      } catch {
        toast.error('Gagal memuat pesan')
      } finally {
        setLoading(false)
        setTimeout(() => scrollToBottom(false), 50)
        setTimeout(() => setSkeleton(false), 500)
      }
    }
    load()
  }, [conversationId])

  useEffect(() => {
    const fetchMeta = async () => {
      // Wait for session to be loaded
      if (status === 'loading' || !session?.user?.id) {
        console.log('Session still loading or user not found, skipping meta fetch')
        return
      }

      try {
        // Add cache-busting parameter to ensure fresh data
        const res = await fetch(`/api/chats/${conversationId}/meta?t=${Date.now()}`)
        if (res.ok) {
          const data = await res.json()
          setMeta(data)
          console.log('=== CONVERSATION PAGE DEBUG ===')
          console.log('Meta data received:', data)
          console.log('Session user ID:', session?.user?.id)
          console.log('Current userId (state):', currentUserId)
          console.log('Meta currentUserRole:', data.currentUserRole)
          console.log('Meta otherUserRole:', data.otherUserRole)
          console.log('Item seller ID:', data.item?.seller?.id)

          // Check if session user ID matches currentUserId
          if (session?.user?.id !== currentUserId) {
            console.log('=== SESSION MISMATCH DETECTED ===')
            console.log('Session user ID:', session?.user?.id)
            console.log('Current userId:', currentUserId)
          }

          console.log('=== END CONVERSATION DEBUG ===')
        } else {
          console.error('META API ERROR:', res.status, res.statusText)
        }
      } catch (error) {
        console.error('META FETCH ERROR:', error)
      }
    }
    fetchMeta()
  }, [conversationId, currentUserId, session?.user?.id, status])

  useEffect(() => {
    const loadOffers = async () => {
      try {
        const res = await fetch(`/api/offers?conversationId=${conversationId}`)
        if (res.ok) setOffers(await res.json())
      } catch {}
    }
    loadOffers()
  }, [conversationId])

  const loadEscrow = useCallback(async () => {
    // Don't load escrow if session not ready
    if (status === 'loading' || !session?.user?.id) {
      console.log('Session not ready, skipping escrow load')
      return
    }

    try {
      const res = await fetch(`/api/escrow?conversationId=${conversationId}&t=${Date.now()}`)
      if (res.ok) {
        const data = await res.json()
        setEscrowRequest(data.escrow)
        console.log('ESCROW REQUEST DATA:', data) // DEBUG: Lihat escrow request data
        console.log('Escrow found:', !!data.escrow)
        if (!data.escrow) {
          console.log('No escrow found for conversation:', conversationId)
        }
        console.log('Escrow found:', !!data.escrow)
        if (!data.escrow) {
          console.log('No escrow found for this conversation')
        }
      } else {
        console.error('ESCROW API ERROR:', res.status, res.statusText)
        setEscrowRequest(null)
      }
    } catch (error) {
      console.error('ESCROW FETCH ERROR:', error)
      setEscrowRequest(null)
    }
  }, [conversationId, session?.user?.id, status])

  useEffect(() => {
    loadEscrow()
  }, [loadEscrow])

  // Handle offer query parameter from community room
  useEffect(() => {
    const offerParam = searchParams.get('offer')
    if (offerParam === 'true') {
      // Focus on offer input after a short delay to ensure DOM is ready
      setTimeout(() => {
        const offerInput = document.querySelector('input[placeholder="Tawar harga (Rp)"]') as HTMLInputElement
        if (offerInput) {
          offerInput.focus()
          offerInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 1000)
    }
  }, [searchParams])

  // Handle item highlighting from item page
  const shouldHighlightItem = searchParams.get('highlightItem') === 'true'

  // Auto-scroll to highlighted item
  useEffect(() => {
    if (shouldHighlightItem && meta?.item) {
      setTimeout(() => {
        const itemCard = document.querySelector('[data-highlight-item="true"]')
        if (itemCard) {
          itemCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 500)
    }
  }, [shouldHighlightItem, meta?.item])

  useEffect(() => {
    registerMessageHandler(ev => {
      if (ev.conversationId !== conversationId) return
      setMessages(prev => mergeUnique(prev, { 
        id: ev.message.id, 
        body: ev.message.body, 
        createdAt: ev.message.createdAt, 
        senderId: ev.message.senderId,
        imageUrl: ev.message.imageUrl,
        sender: ev.message.sender
      }))
      scrollToBottom()
    })
  }, [conversationId, registerMessageHandler, mergeUnique])

  // Listen for real-time escrow notifications
  useEffect(() => {
    if (!currentUserId) return

    const es = new EventSource('/api/notifications/stream')
    notificationEsRef.current = es

    es.addEventListener('escrow.request', (event) => {
      const data = JSON.parse(event.data)
      if (data.conversationId === conversationId) {
        console.log('Real-time escrow request received:', data)
        // Reload escrow data when new request is received
        loadEscrow()
        // Show toast notification
        toast.success('Escrow request received!', {
          description: 'A new escrow request has been created for this conversation.'
        })
      }
    })

    es.addEventListener('escrow.response', (event) => {
      const data = JSON.parse(event.data)
      if (data.conversationId === conversationId) {
        console.log('Real-time escrow response received:', data)
        // Reload escrow data when response is received
        loadEscrow()
        // Show toast notification
        const action = data.escrow.action === 'accept' ? 'accepted' : 'rejected'
        toast.success(`Escrow ${action}!`, {
          description: `The seller has ${action} the escrow request.`
        })
      }
    })

    es.addEventListener('escrow.confirm', (event) => {
      const data = JSON.parse(event.data)
      if (data.conversationId === conversationId) {
        console.log('Real-time escrow confirm received:', data)
        // Reload escrow data when confirmation is received
        loadEscrow()
        // Show toast notification
        toast.success('Escrow confirmed!', {
          description: 'The escrow has been confirmed and is now active.'
        })
      }
    })

    es.onerror = () => {
      console.error('Notification stream error')
    }

    return () => {
      es.close()
    }
  }, [conversationId, currentUserId, loadEscrow])

  // Don't render until session is loaded
  if (status === 'loading') {
    return <div className='container py-10 flex justify-center'><LoadingSpinner /></div>
  }

  if (!session?.user) {
    return <div className='container py-10 text-center'>Please login to view this conversation</div>
  }

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
      toast.success('Pesan terkirim')
    } catch {
      toast.error('Gagal mengirim pesan')
    } finally { setSending(false) }
  }

  const uploadImage = async (file: File) => {
    if (uploadingImage) return
    setUploadingImage(true)
    
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('conversationId', conversationId)
      
      const res = await fetch('/api/chats/upload-image', {
        method: 'POST',
        body: formData
      })
      
      if (!res.ok) throw new Error('Upload failed')
      
      const data = await res.json()
      const msg = data.message
      
      setMessages(prev => mergeUnique(prev, msg))
      scrollToBottom()
      fetch(`/api/chats/${conversationId}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lastMessageId: msg.id }) })
      toast.success('Gambar terkirim')
    } catch {
      toast.error('Gagal upload gambar')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang diperbolehkan')
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5MB')
      return
    }
    
    uploadImage(file)
    // Reset input
    e.target.value = ''
  }

  const sendOffer = async () => {
    const amt = parseInt(offerAmount.replace(/[^0-9]/g,''), 10)
    if (!amt || !meta?.item) {
      toast.error('Masukkan nominal tawaran yang valid')
      return
    }
    try {
      const res = await fetch('/api/offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, itemId: meta.item.id, amount: amt }) })
      if (res.ok) {
        const o = await res.json(); setOffers(prev => [...prev, o]); setOfferAmount('')
        toast.success('Offer dikirim')
      } else {
        toast.error('Gagal mengirim offer')
      }
    } catch {
      toast.error('Gagal mengirim offer')
    }
  }

  const actOnOffer = async (id: string, status: 'ACCEPTED'|'REJECTED'|'COUNTER', amount?: number) => {
    try {
      const res = await fetch(`/api/offers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, amount }) })
      if (res.ok) {
        const updated = await res.json()
        if (status === 'COUNTER') setOffers(prev => [...prev, updated])
        else setOffers(prev => prev.map(o => o.id === id ? { ...o, status } : o))
        toast.success('Offer diupdate')
      } else {
        toast.error('Gagal update offer')
      }
    } catch {
      toast.error('Gagal update offer')
    }
  }

  const requestEscrow = async () => {
    if (requestingEscrow || !meta?.item || !currentUserId) {
      console.log('❌ REQUEST ESCROW BLOCKED:', {
        requestingEscrow,
        hasMetaItem: !!meta?.item,
        currentUserId
      })
      return
    }
    setRequestingEscrow(true)
    try {
      console.log('🚀 REQUESTING ESCROW:', {
        conversationId,
        itemId: meta.item.id,
        currentUserId,
        metaItem: meta.item
      })

      const res = await fetch('/api/escrow/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          itemId: meta.item.id
        })
      })

      console.log('📡 ESCROW REQUEST RESPONSE:', {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok
      })

      if (res.ok) {
        const data = await res.json()
        console.log('✅ ESCROW CREATED:', data)
        setEscrowRequest(data.escrow)
        toast.success('Escrow request sent - waiting for seller approval')

        // Refresh escrow data after a short delay to ensure it's saved
        setTimeout(() => {
          loadEscrow()
        }, 1000)
      } else {
        const error = await res.json()
        console.error('❌ ESCROW REQUEST FAILED:', error)
        toast.error(error.message || 'Failed to request escrow')
      }
    } catch (error) {
      console.error('💥 ESCROW REQUEST ERROR:', error)
      toast.error('Failed to request escrow')
    } finally {
      setRequestingEscrow(false)
    }
  }

  const respondToEscrowRequest = async (action: 'accept' | 'reject') => {
    if (respondingEscrow || !escrowRequest) return
    setRespondingEscrow(true)
    try {
      const res = await fetch(`/api/escrow/respond/${escrowRequest.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (res.ok) {
        const message = action === 'accept' ? 'Escrow request accepted' : 'Escrow request rejected'
        toast.success(message)
        if (action === 'reject') {
          setEscrowRequest(null)
        } else {
          loadEscrow() // Reload to get updated status
        }
      } else {
        const error = await res.json()
        toast.error(error.message || `Failed to ${action} escrow request`)
      }
    } catch {
      toast.error(`Failed to ${action} escrow request`)
    } finally {
      setRespondingEscrow(false)
    }
  }

  const cancelEscrowRequest = async () => {
    if (respondingEscrow || !escrowRequest) return
    setRespondingEscrow(true)
    try {
      console.log('Cancelling escrow request:', escrowRequest.id)
      const res = await fetch(`/api/escrow/${escrowRequest.id}`, {
        method: 'DELETE'
      })
      console.log('Cancel response:', res.status, res.statusText)
      
      if (res.ok) {
        setEscrowRequest(null)
        toast.success('Escrow request cancelled')
      } else {
        const error = await res.json()
        console.error('Cancel error:', error)
        toast.error(error.message || 'Failed to cancel escrow request')
      }
    } catch (error) {
      console.error('Cancel exception:', error)
      toast.error('Failed to cancel escrow request')
    } finally { 
      setRespondingEscrow(false) 
    }
  }

  const confirmEscrow = async () => {
    if (confirmingEscrow || !escrowRequest) return
    setConfirmingEscrow(true)
    try {
      const res = await fetch(`/api/escrow/confirm/${escrowRequest.id}`, {
        method: 'POST'
      })
      if (res.ok) {
        toast.success('Escrow confirmed and activated!')
        loadEscrow() // Reload to get updated status
      } else {
        const error = await res.json()
        toast.error(error.message || 'Failed to confirm escrow')
      }
    } catch {
      toast.error('Failed to confirm escrow')
    } finally {
      setConfirmingEscrow(false)
    }
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
    } catch {
      toast.error('Gagal memuat pesan lama')
    } finally { setLoadingMore(false) }
  }

  if (loading) return <div className='container py-10 flex justify-center'><LoadingSpinner /></div>

  return (
    <div className='container max-w-2xl py-10'>
      <Card className='p-4 mb-4 flex items-center justify-between'>
        <Button variant='ghost' size='sm' aria-label='Kembali ke daftar percakapan' onClick={() => router.push('/conversations')}>Back</Button>
        <p className='text-sm text-muted-foreground'>Conversation</p>
      </Card>
      {meta?.item && (
        <Card 
          className={`mb-4 p-4 flex gap-4 items-center transition-all duration-500 ${
            shouldHighlightItem 
              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/20 bg-gradient-to-r from-primary/5 to-transparent' 
              : ''
          }`}
          data-highlight-item={shouldHighlightItem ? 'true' : undefined}
        >
          {meta.item.imageUrl && (
            <div className='relative w-16 h-16'>
              <Image src={meta.item.imageUrl} alt={meta.item.name} fill sizes="64px" className='object-cover rounded border' unoptimized />
            </div>
          )}
          <div className='flex-1'>
            <p className='font-medium text-sm'>{meta.item.name}</p>
            <p className='text-xs text-muted-foreground'>Rp {meta.item.price.toLocaleString()}</p>
            {meta.otherUser && currentUserId && (
              <div className='mt-1'>
                <p className='text-[11px] text-muted-foreground'>With: {meta.otherUser.name}</p>
                <p className='text-[10px] font-medium'>
                  <span className={meta.currentUserRole === 'SELLER' ? 'text-green-600' : 'text-orange-600'}>
                    You are {meta.currentUserRole === 'SELLER' ? 'selling to' : 'buying from'}
                  </span>
                  <span className='text-muted-foreground'> {meta.otherUser.name} ({meta.otherUserRole})</span>
                </p>
                {/* DEBUG: Show role info */}
                <p className='text-[9px] text-red-500 mt-1'>
                  DEBUG: currentUserRole={meta.currentUserRole}, otherUserRole={meta.otherUserRole}
                </p>
              </div>
            )}
            {shouldHighlightItem && (
              <p className='text-xs text-primary font-medium mt-1 animate-pulse'>💬 Discussing this item</p>
            )}
          </div>
          <Button
            variant='outline'
            size='sm'
            aria-label='Lihat detail item'
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
                    <Button size='sm' variant='outline' aria-label='Terima offer' onClick={() => actOnOffer(o.id, 'ACCEPTED')}>Accept</Button>
                    <Button size='sm' variant='outline' aria-label='Tolak offer' onClick={() => actOnOffer(o.id, 'REJECTED')}>Reject</Button>
                    <div className='flex items-center gap-1'>
                      <Input value={counterAmount} onChange={e=>setCounterAmount(e.target.value)} placeholder='Counter' className='h-8 w-24' />
                      <Button size='sm' variant='secondary' aria-label='Counter offer' onClick={() => { const a = parseInt(counterAmount.replace(/[^0-9]/g,''),10); if(a){ actOnOffer(o.id,'COUNTER', a); setCounterAmount('') } else { toast.error('Nominal counter tidak valid') } }}>Counter</Button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className='flex gap-2'>
          <Input value={offerAmount} onChange={e=>setOfferAmount(e.target.value)} placeholder='Tawar harga (Rp)' className='w-40' />
          <Button onClick={sendOffer} aria-label='Kirim offer' disabled={!offerAmount.trim() || !meta?.item}>Kirim Offer</Button>
        </div>
      </Card>
      {meta?.item && (
        <Card className='mb-4 p-4'>
          <p className='font-medium mb-2 text-sm'>Escrow</p>
          <div className='mb-2 p-2 bg-blue-50 rounded text-xs'>
            <p>🔍 DEBUG INFO:</p>
            <p>meta.item exists: {JSON.stringify(!!meta?.item)}</p>
            <p>escrowRequest data: {JSON.stringify(escrowRequest)}</p>
            <p>requestingEscrow: {requestingEscrow}</p>
            <p>respondingEscrow: {respondingEscrow}</p>
            <p>confirmingEscrow: {confirmingEscrow}</p>
            <p>currentUserId: {currentUserId}</p>
          </div>
          {escrowRequest ? (
            <div className='text-sm'>
              <p>Status: <span className='font-mono'>{escrowRequest.requestStatus || escrowRequest.status}</span></p>
              <p>Amount: Rp {escrowRequest.totalAmount?.toLocaleString()}</p>

              {/* COMPREHENSIVE DEBUG INFO */}
              <div className='text-xs text-red-500 mb-2 p-2 bg-red-50 rounded'>
                <strong>🔍 ESCROW DEBUG INFO:</strong><br/>
                - requestStatus: "{escrowRequest.requestStatus}"<br/>
                - status: "{escrowRequest.status}"<br/>
                - buyerId: "{escrowRequest.buyerId || escrowRequest.buyer?.id}"<br/>
                - sellerId: "{escrowRequest.sellerId || escrowRequest.seller?.id}"<br/>
                - currentUserId: "{currentUserId}"<br/>
                - isSeller: {(escrowRequest.sellerId || escrowRequest.seller?.id) === currentUserId ? '✅ YES' : '❌ NO'}<br/>
                - isBuyer: {(escrowRequest.buyerId || escrowRequest.buyer?.id) === currentUserId ? '✅ YES' : '❌ NO'}<br/>
                - meta.currentUserRole: "{meta?.currentUserRole}"<br/>
                - meta.otherUserRole: "{meta?.otherUserRole}"<br/>
                <br/>
                <strong>📊 CONDITIONS CHECK:</strong><br/>
                - PENDING_SELLER_CONFIRMATION && isSeller: {escrowRequest.requestStatus === 'PENDING_SELLER_CONFIRMATION' && (escrowRequest.sellerId || escrowRequest.seller?.id) === currentUserId ? '✅ TRUE' : '❌ FALSE'}<br/>
                - ACCEPTED && isBuyer: {escrowRequest.requestStatus === 'ACCEPTED' && (escrowRequest.buyerId || escrowRequest.buyer?.id) === currentUserId ? '✅ TRUE' : '❌ FALSE'}<br/>
                - PENDING_BUYER_REQUEST && isBuyer: {escrowRequest.requestStatus === 'PENDING_BUYER_REQUEST' && (escrowRequest.buyerId || escrowRequest.buyer?.id) === currentUserId ? '✅ TRUE' : '❌ FALSE'}<br/>
              </div>

              {/* Show different actions based on status and user role */}
              {escrowRequest.requestStatus === 'PENDING_SELLER_CONFIRMATION' && (escrowRequest.sellerId || escrowRequest.seller?.id) === currentUserId && (
                <div className='mt-2 flex gap-2'>
                  <Button
                    variant='default'
                    size='sm'
                    disabled={respondingEscrow}
                    onClick={() => respondToEscrowRequest('accept')}
                    aria-label='Accept escrow request'
                  >
                    {respondingEscrow ? 'Accepting...' : 'Accept Request'}
                  </Button>
                  <Button
                    variant='destructive'
                    size='sm'
                    disabled={respondingEscrow}
                    onClick={() => respondToEscrowRequest('reject')}
                    aria-label='Reject escrow request'
                  >
                    {respondingEscrow ? 'Rejecting...' : 'Reject Request'}
                  </Button>
                </div>
              )}

              {escrowRequest.requestStatus === 'ACCEPTED' && (escrowRequest.buyerId || escrowRequest.buyer?.id) === currentUserId && (
                <div className='mt-2'>
                  <Button
                    variant='default'
                    size='sm'
                    disabled={confirmingEscrow}
                    onClick={confirmEscrow}
                    aria-label='Confirm escrow'
                  >
                    {confirmingEscrow ? 'Confirming...' : 'Confirm Escrow'}
                  </Button>
                </div>
              )}

              {escrowRequest.status === 'FUNDS_HELD' && (
                <div className='mt-2'>
                  <p className='text-green-600 font-medium'>✅ Escrow Active</p>
                  <p className='text-xs text-muted-foreground'>Funds are held securely. Complete your transaction.</p>
                </div>
              )}

              {/* Cancel option for pending requests - only for buyer */}
              {escrowRequest.requestStatus === 'PENDING_BUYER_REQUEST' && (escrowRequest.buyerId || escrowRequest.buyer?.id) === currentUserId && (
                <div className='mt-2'>
                  <Button
                    variant='destructive'
                    size='sm'
                    disabled={respondingEscrow}
                    onClick={cancelEscrowRequest}
                    aria-label='Cancel escrow request'
                  >
                    {respondingEscrow ? 'Cancelling...' : 'Cancel Request'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className='flex items-center gap-2'>
              <Button disabled={requestingEscrow} aria-label='Request escrow' onClick={requestEscrow}>Request Escrow</Button>
              <p className='text-xs text-muted-foreground'>Request escrow protection for this transaction</p>
            </div>
          )}
        </Card>
      )}
      {!meta?.item && (
        <Card className='mb-4 p-4 border-red-200 bg-red-50'>
          <p className='font-medium mb-2 text-sm text-red-600'>🚨 DEBUG: No Item Data</p>
          <p className='text-xs text-red-500'>Conversation ini tidak memiliki item data, jadi escrow card tidak muncul</p>
          <p className='text-xs text-muted-foreground mt-2'>Meta data: {JSON.stringify(meta, null, 2)}</p>
        </Card>
      )}
      <div className='mb-4 max-h-[60vh] overflow-y-auto space-y-3 border rounded p-4'>
        {nextCursor && (
          <div className='flex justify-center mb-2'>
            <Button size='sm' variant='outline' aria-label='Muat pesan lama' disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading...' : 'Load older'}</Button>
          </div>
        )}
        {skeleton ? (
          <div className='space-y-2'>
            {[...Array(6)].map((_,i)=>(
              <div key={i} className='h-8 bg-muted/50 rounded animate-pulse w-2/3'></div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className='text-center text-muted-foreground text-sm'>Belum ada pesan di percakapan ini</div>
        ) : (
          messages.map(m => {
            const isMine = currentUserId && m.senderId === currentUserId
            const isAdmin = m.sender?.role === 'ADMIN'
            const isAdminNotMine = isAdmin && !isMine
            
            // Admin messages from others in center, admin's own messages in right
            const justifyClass = isAdminNotMine ? 'justify-center' : isMine ? 'justify-end' : 'justify-start'
            
            // Determine role label
            let roleLabel = ''
            if (isAdmin) {
              roleLabel = 'ADMIN'
            } else if (meta?.item && currentUserId) {
              // DEBUG: Log role determination
              console.log('=== MESSAGE ROLE DEBUG ===')
              console.log('Message senderId:', m.senderId)
              console.log('Current userId:', currentUserId)
              console.log('Meta currentUserRole:', meta.currentUserRole)
              console.log('Meta otherUserRole:', meta.otherUserRole)
              console.log('isMine:', isMine)
              
              // Use role information from meta API if available
              if (m.senderId === currentUserId) {
                roleLabel = meta.currentUserRole || 'BUYER'
              } else {
                roleLabel = meta.otherUserRole || 'SELLER'
              }
              
              console.log('Assigned roleLabel:', roleLabel)
              console.log('=== END MESSAGE ROLE DEBUG ===')
            }
            
            return (
              <div key={m.id} className={`flex ${justifyClass}`}>
                <div className={`px-3 py-2 rounded-lg max-w-[80%] shadow-sm whitespace-pre-wrap break-words text-sm leading-snug 
                  ${isAdminNotMine ? 'bg-blue-100 text-blue-900 rounded-lg border border-blue-200' : 
                    isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 
                    'bg-muted rounded-bl-sm'}`}> 
                  <div className={`text-[10px] font-medium mb-1 ${isAdminNotMine ? 'text-blue-700 text-center' : roleLabel === 'SELLER' ? 'text-green-700' : 'text-orange-700'}`}>
                    {isMine ? `You (${roleLabel})` : `${m.sender?.name || 'Unknown'} (${roleLabel})`}
                  </div>
                  {m.imageUrl && (
                    <div className="mb-2">
                      <Image 
                        src={m.imageUrl} 
                        alt="Shared image" 
                        width={200} 
                        height={200} 
                        className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(m.imageUrl!, '_blank')}
                        unoptimized
                      />
                    </div>
                  )}
                  {m.body && <p>{m.body}</p>}
                  <p className={`text-[10px] mt-1 opacity-70 text-center ${isAdminNotMine ? 'text-blue-700' : isMine ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
      <Card className='p-3'>
        <div className='flex gap-2'>
          <div className='flex-1'>
            <Input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder='Type a message...' 
              aria-label='Tulis pesan' 
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }} 
            />
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploadingImage}
            id="image-upload"
          />
          <Button 
            variant="outline" 
            size="icon" 
            aria-label='Upload gambar'
            disabled={uploadingImage}
            onClick={() => (document.getElementById('image-upload') as HTMLInputElement)?.click()}
          >
            {uploadingImage ? '...' : '📷'}
          </Button>
          <Button disabled={sending || !input.trim()} aria-label='Kirim pesan' onClick={send}>Send</Button>
        </div>
      </Card>
    </div>
  )
}
