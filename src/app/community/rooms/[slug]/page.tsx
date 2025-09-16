"use client"
import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useChatRealtime } from '@/components/chat-realtime-provider'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingCart,
  DollarSign,
  Gamepad2,
  FileText,
  MessageCircle,
  HandHeart,
  Copy,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Reply,
  UserPlus
} from 'lucide-react'

interface CMsg {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  replyToId?: string | null;
  replyPreview?: { id: string; body: string; senderName: string } | null;
  imageUrl?: string | null;
  roomSlug?: string | null;
  type?: string;
  itemId?: string;
  itemData?: any; // For temporary items created from quick sell form
}

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
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [roomInfo, setRoomInfo] = useState<{ isTradable?: boolean; name?: string } | null>(null)
  const [quickSellOpen, setQuickSellOpen] = useState(false);
  const [quickSellForm, setQuickSellForm] = useState({
    name: '',
    price: '',
    currency: 'Rp',
    description: '',
    game: '',
    images: [] as File[],
  });
  const [imagePreviewIdx, setImagePreviewIdx] = useState(0);
  const [currentImageIndices, setCurrentImageIndices] = useState<{[key: string]: number}>({});
  const [sellForm, setSellForm] = useState({
    title: '',
    price: '',
    description: '',
    hashtags: '',
    images: [] as File[],
  });
  const [sellPreviewIdx, setSellPreviewIdx] = useState(0);
  // Modal untuk preview gambar
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState<string>('');
  const [modalImageAlt, setModalImageAlt] = useState<string>('');
  // Zoom dan pan untuk modal gambar
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // Modal untuk info user
  const [userInfoModalOpen, setUserInfoModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userInfoLoading, setUserInfoLoading] = useState(false);
  // Modal untuk warning conversation sudah ada
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningData, setWarningData] = useState<{
    message: string;
    sellerName: string;
    existingConversationId: string;
    itemId: string;
  } | null>(null);

  const handleSellInput = (field: string, value: any) => {
    setSellForm(f => ({ ...f, [field]: value }));
  };
  const handleQuickSellImages = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 8); // Max 8 images
    setQuickSellForm(f => ({ ...f, images: arr }));
    setImagePreviewIdx(0);
  };

  const handleSellImages = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5);
    setSellForm(f => ({ ...f, images: arr }));
    setSellPreviewIdx(0);
  };

  // Function untuk buka modal preview gambar
  const openImageModal = (src: string, alt: string = 'Preview') => {
    setModalImageSrc(src);
    setModalImageAlt(alt);
    setImageModalOpen(true);
    // Reset zoom dan pan
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Function untuk zoom in/out
  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
    if (direction === 'in') {
      setZoomLevel(prev => Math.min(prev + 0.25, 3));
    } else if (direction === 'out') {
      setZoomLevel(prev => Math.max(prev - 0.25, 0.25));
    } else {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    }
  };

  // Function untuk handle mouse down (start drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  // Function untuk handle mouse move (drag)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // Function untuk handle mouse up (stop drag)
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Function untuk buka modal info user
  const openUserInfoModal = async (userId: string, userName: string) => {
    if (!userId || userId === currentUserId) return; // Jangan buka modal untuk user sendiri
    
    setUserInfoLoading(true);
    setUserInfoModalOpen(true);
    
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (res.ok) {
        const userData = await res.json();
        setSelectedUser({ ...userData, name: userName });
      } else {
        setSelectedUser({ id: userId, name: userName, error: 'Pengguna tidak ditemukan' });
      }
    } catch (error) {
      setSelectedUser({ id: userId, name: userName, error: 'Gagal memuat info pengguna' });
    } finally {
      setUserInfoLoading(false);
    }
  };

  // Function untuk add friend
  const handleAddFriend = async (userId: string) => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId })
      });
      
      if (res.ok) {
        import('sonner').then(({ toast }) => toast.success('Friend request sent!'));
        setUserInfoModalOpen(false);
      } else {
        const error = await res.json();
        import('sonner').then(({ toast }) => toast.error(error.message || 'Gagal mengirim permintaan pertemanan'));
      }
    } catch (error) {
      import('sonner').then(({ toast }) => toast.error('Gagal mengirim permintaan pertemanan'));
    }
  };

  // Function untuk handle chat dengan warning
  const handleChatWithWarning = async (itemId: string, redirectUrl?: string) => {
    try {
      const res = await fetch('/api/chats/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId })
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Chat start result:', data);

        if (data.warning) {
          // Show warning modal
          setWarningData({
            message: data.message,
            sellerName: data.sellerName,
            existingConversationId: data.existingConversationId,
            itemId: itemId
          });
          setWarningModalOpen(true);
        } else {
          // No warning, redirect directly
          window.location.href = redirectUrl || `/conversations/${data.conversationId}`;
        }
      } else {
        console.error('Chat start failed:', res.status);
        import('sonner').then(({ toast }) => toast.error('Gagal memulai percakapan'));
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      import('sonner').then(({ toast }) => toast.error('Gagal memulai percakapan'));
    }
  };

  // Function untuk continue existing conversation
  const handleContinueConversation = () => {
    if (warningData) {
      window.location.href = `/conversations/${warningData.existingConversationId}`;
    }
    setWarningModalOpen(false);
  };

  // Function untuk create new conversation
  const handleCreateNewConversation = async () => {
    if (warningData) {
      try {
        // Force create new conversation by calling API again
        // The backend will create a new conversation since we already have one
        const res = await fetch('/api/chats/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: warningData.itemId, forceNew: true })
        });

        if (res.ok) {
          const data = await res.json();
          window.location.href = `/conversations/${data.conversationId}`;
        } else {
          import('sonner').then(({ toast }) => toast.error('Gagal membuat percakapan baru'));
        }
      } catch (error) {
        import('sonner').then(({ toast }) => toast.error('Gagal membuat percakapan baru'));
      }
    }
    setWarningModalOpen(false);
  };

  const handleSellSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!postListingItemId) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append('itemId', postListingItemId);
      form.append('title', sellForm.title);
      form.append('price', sellForm.price);
      form.append('description', sellForm.description);
      form.append('hashtags', sellForm.hashtags);
      sellForm.images.forEach((img, i) => form.append('images', img));
      const res = await fetch(`/api/community/rooms/${slug}/listings`, {
        method: 'POST',
        body: form,
      });
      if (res.ok) {
        setPostListingItemId('');
        setSellForm({ title: '', price: '', description: '', hashtags: '', images: [] });
        setSellModalOpen(false);
        const data = await fetch(`/api/community/rooms/${slug}/listings`).then(r=>r.json());
        setListings(data.listings || []);
        import('sonner').then(({ toast }) => toast.success('Produk berhasil dijual di room!'));
      } else {
        import('sonner').then(({ toast }) => toast.error('Gagal jual produk!'));
      }
    } finally {
      setSending(false);
    }
  };

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
    // Only load listings if room is tradable
    if (roomInfo?.isTradable) {
      loadListings()
    }
  }, [slug, roomInfo?.isTradable])

  useEffect(() => {
    // Fetch current user's items for picker (bukan hanya seller)
    const loadMyItems = async () => {
      try {
        if (!session?.user?.id) return;
        const res = await fetch(`/api/users/${session.user.id}/items`)
        if (!res.ok) return;
        const items = await res.json();
        setMyItems((items || []).filter((it: any) => it.isAvailable));
      } catch {}
    };
    loadMyItems();
  }, [session?.user?.id]);

  useEffect(() => {
    const loadRoomInfo = async () => {
      try {
        const res = await fetch('/api/community/rooms')
        if (!res.ok) return;
        const rooms = await res.json();
        const room = rooms.find((r: any) => r.slug === slug);
        if (room) {
          setRoomInfo({ isTradable: room.isTradable, name: room.name });
        }
      } catch {}
    };
    loadRoomInfo();
  }, [slug]);

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
    } finally { 
      setSending(false)
      setQuickSellOpen(false) // Tutup dropdown saat kirim pesan
    }
  }

  if (loading) return <div className='p-6'>Loading...</div>

  return (
    <div className='container max-w-4xl py-8'>
      <Card className='p-4 mb-4 flex items-center justify-between'>
        <h1 className='text-lg font-semibold'>Room: {slug}</h1>
        <span className={`text-xs px-2 py-1 rounded ${connected ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>{connected ? 'Live' : 'Offline'}</span>
      </Card>
      {/* Listings section - only show for tradable rooms */}
      {roomInfo?.isTradable && (
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
          {session?.user && (
            <div className="my-4">
              <Button onClick={() => setSellModalOpen(true)}>+ Jual Item Baru</Button>
            </div>
          )}
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
                <div className='flex flex-col gap-2'>
                  <div className='flex justify-between items-center'>
                    <Link href={`/items/${l.item?.id}`} className='underline text-xs'>Detail</Link>
                    <form method='post' action='/api/chats/start' onSubmit={(e)=>{ e.preventDefault(); handleChatWithWarning(l.item?.id) }}>
                      <Button type='submit' size='sm' variant='outline'>Chat Seller</Button>
                    </form>
                  </div>
                  {l.status === 'AVAILABLE' && currentUserId && l.sellerId !== currentUserId && (
                    <Button size='sm' variant='secondary' onClick={async ()=>{
                      // Handle chat with warning first
                      await handleChatWithWarning(l.item?.id, `/conversations/${l.item?.id}?escrow=true`);
                    }}>
                      Mulai Rekber
                    </Button>
                  )}
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
      )}
      <Card className='p-0 overflow-hidden'>
        <div className='h-[60vh] overflow-y-auto flex flex-col gap-2 p-4'>
          {nextCursor && (
            <div className='flex justify-center mb-2'>
              <Button variant='outline' size='sm' disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading...' : 'Load older'}</Button>
            </div>
          )}
          {messages.map(m => {
            const isMine = currentUserId && m.senderId === currentUserId;
            // Jika pesan tipe PRODUCT, render bubble khusus product
            if (m.type === 'PRODUCT' && m.itemId) {
              const product = myItems.find((it:any) => it.id === m.itemId) || listings.find((l:any) => l.item?.id === m.itemId)?.item;
              if (!product) return null;
              return (
                <div key={m.id} className={`group flex items-start gap-2 ${isMine ? 'justify-end' : ''}`}> 
                  <div className={`flex-1 min-w-0 max-w-[85%] ${isMine ? 'flex justify-end' : ''}`}> 
                    <div className={`flex ${isMine ? 'justify-end text-right' : 'items-baseline'} gap-2 flex-wrap`}>
                      {!isMine && (
                        <button 
                          onClick={() => openUserInfoModal(m.senderId, m.senderName || 'User')}
                          className='text-xs font-semibold hover:text-blue-600 hover:underline transition-colors'
                        >
                          {m.senderName || 'User'}
                        </button>
                      )}
                      {isMine && <span className='text-xs font-semibold text-primary'>You</span>}
                      <span className='text-[10px] text-muted-foreground'>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`inline-block rounded-lg px-4 py-3 text-sm shadow-md space-y-3 border-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200`}>
                      <div className='flex items-start gap-3'>
                        {product.imageUrl && (
                          <div className='flex-shrink-0'>
                            <div
                              className='relative w-20 h-20 rounded-lg overflow-hidden border-2 border-blue-300 cursor-pointer hover:border-blue-400 transition'
                              onClick={() => openImageModal(product.imageUrl, product.name)}
                            >
                              <Image src={product.imageUrl} alt={product.name} fill className='object-cover' unoptimized />
                            </div>
                          </div>
                        )}
                        <div className='flex-1 min-w-0'>
                          <div className='font-bold text-base text-blue-900 mb-1'>{product.name}</div>
                          <div className='text-lg font-semibold text-green-600 mb-2 flex items-center gap-1'>
                            <DollarSign className="w-4 h-4" />
                            Rp {(product.price ?? 0).toLocaleString()}
                          </div>
                          {product.description && (
                            <div className='text-xs text-gray-600 mb-2 line-clamp-2'>{product.description}</div>
                          )}
                        </div>
                      </div>
                      <div className='flex gap-2 pt-2 border-t border-blue-200'>
                        <Button size='sm' variant='outline' className='flex-1' onClick={() => handleChatWithWarning(product.id)}>
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat Seller
                        </Button>
                        <Button size='sm' variant='default' className='flex-1' onClick={() => handleChatWithWarning(product.id, `/conversations/${product.id}?offer=true`)}>
                          <HandHeart className="w-4 h-4 mr-1" />
                          Tawar Harga
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            // Jika pesan tipe QUICK_SELL (item baru dari form)
            if (m.type === 'QUICK_SELL' && m.itemData) {
              const itemData = m.itemData as any;
              const currentImageIdx = currentImageIndices[m.id] || 0;
              
              return (
                <div key={m.id} className={`group flex items-start gap-2 ${isMine ? 'justify-end' : ''}`}> 
                  <div className={`flex-1 min-w-0 max-w-[85%] ${isMine ? 'flex justify-end' : ''}`}> 
                    <div className={`flex ${isMine ? 'justify-end text-right' : 'items-baseline'} gap-2 flex-wrap`}>
                      {!isMine && (
                        <button 
                          onClick={() => openUserInfoModal(m.senderId, m.senderName || 'User')}
                          className='text-xs font-semibold hover:text-blue-600 hover:underline transition-colors'
                        >
                          {m.senderName || 'User'}
                        </button>
                      )}
                      {isMine && <span className='text-xs font-semibold text-primary'>You</span>}
                      <span className='text-[10px] text-muted-foreground'>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`inline-block rounded-lg px-4 py-3 text-sm shadow-md space-y-3 border-2 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200`}>
                      <div className='flex items-start gap-3'>
                        {itemData.images && itemData.images.length > 0 && (
                          <div className='flex-shrink-0'>
                            <div
                              className='relative w-24 h-24 rounded-lg overflow-hidden border-2 border-green-300 cursor-pointer hover:border-green-400 transition'
                              onClick={() => openImageModal(itemData.images[currentImageIdx], `${itemData.name} - Image ${currentImageIdx + 1}`)}
                            >
                              <Image 
                                src={itemData.images[currentImageIdx]} 
                                alt={`${itemData.name} ${currentImageIdx + 1}`} 
                                fill 
                                className='object-cover' 
                                unoptimized 
                              />
                              {itemData.images.length > 1 && (
                                <>
                                  <button 
                                    className='absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 text-white px-1 py-0.5 rounded text-xs hover:bg-black/70'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentImageIndices(prev => ({ 
                                        ...prev, 
                                        [m.id]: currentImageIdx > 0 ? currentImageIdx - 1 : itemData.images.length - 1 
                                      }));
                                    }}
                                  >
                                    <ChevronLeft className="w-3 h-3" />
                                  </button>
                                  <button 
                                    className='absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 text-white px-1 py-0.5 rounded text-xs hover:bg-black/70'
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentImageIndices(prev => ({ 
                                        ...prev, 
                                        [m.id]: currentImageIdx < itemData.images.length - 1 ? currentImageIdx + 1 : 0 
                                      }));
                                    }}
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        <div className='flex-1 min-w-0'>
                          <div className='font-bold text-base text-green-900 mb-1 flex items-center gap-2'>
                            <ShoppingCart className="w-5 h-5 text-green-600" />
                            {itemData.name}
                            {itemData.images && itemData.images.length > 1 && (
                              <span className='text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full'>
                                {currentImageIdx + 1}/{itemData.images.length}
                              </span>
                            )}
                          </div>
                          <div className='text-lg font-semibold text-green-600 mb-1 flex items-center gap-1'>
                            <DollarSign className="w-4 h-4" />
                            {itemData.currency || 'Rp'} {parseInt(itemData.price).toLocaleString()}
                          </div>
                          <div className='text-sm text-blue-600 mb-2 flex items-center gap-1'>
                            <Gamepad2 className="w-4 h-4" />
                            {itemData.game}
                          </div>
                          <div className='text-xs text-gray-600 mb-3 flex items-start gap-1'>
                            <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className='line-clamp-3'>{itemData.description}</span>
                          </div>
                          
                          {itemData.images && itemData.images.length > 1 && (
                            <div className='flex justify-center gap-1 mb-3'>
                              {itemData.images.map((_: any, idx: number) => (
                                <button
                                  key={idx}
                                  className={`w-2 h-2 rounded-full transition ${idx === currentImageIdx ? 'bg-green-500' : 'bg-gray-300'}`}
                                  onClick={() => setCurrentImageIndices(prev => ({ ...prev, [m.id]: idx }))}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className='flex gap-2 pt-2 border-t border-green-200'>
                        <Button size='sm' variant='outline' className='flex-1' onClick={() => {
                          // Copy contact info or start chat
                          navigator.clipboard.writeText(`🛒 ${itemData.name}\n💰 ${itemData.currency || 'Rp'} ${itemData.price}\n🎮 ${itemData.game}\n📝 ${itemData.description}\n👤 Penjual: ${m.senderName}`);
                          import('sonner').then(({ toast }) => toast.success('Info item berhasil disalin!'));
                        }}>
                          <Copy className="w-3 h-3 mr-1" />
                          Salin Info
                        </Button>
                        <Button size='sm' variant='default' className='flex-1' onClick={async () => {
                          try {
                            let itemId = null;

                            // For QUICK_SELL messages, create a temporary item first
                            if (m.type === 'QUICK_SELL' && itemData) {
                              const createItemRes = await fetch('/api/items', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name: itemData.name,
                                  description: itemData.description,
                                  price: itemData.price,
                                  images: itemData.images || [],
                                  game: itemData.game,
                                  currency: itemData.currency,
                                  isTemporary: true
                                })
                              });

                              if (createItemRes.ok) {
                                const createdItem = await createItemRes.json();
                                itemId = createdItem.id;
                              }
                            }

                            // Start the conversation
                            const conversationData: any = { recipientId: m.senderId };
                            if (itemId) {
                              conversationData.itemId = itemId;
                            }

                            const res = await fetch('/api/messages/start', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(conversationData)
                            });

                            if (res.ok) {
                              const data = await res.json();
                              window.location.href = `/conversations/${data.conversationId}`;
                            } else {
                              const error = await res.json();
                              alert(error.message || 'Failed to start conversation');
                            }
                          } catch (e) {
                            console.error('Failed to start direct message:', e);
                            alert('Failed to start conversation');
                          }
                        }}>
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Chat Penjual
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            // Bubble chat biasa
            return (
              <div key={m.id} className={`group flex items-start gap-2 ${isMine ? 'justify-end' : ''}`}> 
                <div className={`flex-1 min-w-0 max-w-[78%] ${isMine ? 'flex justify-end' : ''}`}> 
                  <div className={`flex ${isMine ? 'justify-end text-right' : 'items-baseline'} gap-2 flex-wrap`}> 
                    {!isMine && (
                      <button 
                        onClick={() => openUserInfoModal(m.senderId, m.senderName || 'User')}
                        className='text-xs font-semibold hover:text-blue-600 hover:underline transition-colors'
                      >
                        {m.senderName || 'User'}
                      </button>
                    )}
                    {isMine && <span className='text-xs font-semibold text-primary'>You</span>}
                    <span className='text-[10px] text-muted-foreground'>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button onClick={()=> setReplyTarget(m)} className={`opacity-0 group-hover:opacity-100 text-[10px] px-1 py-0.5 rounded bg-muted hover:bg-primary/10 transition ${isMine ? 'order-first' : ''}`}>Reply</button>
                  </div>
                  {m.replyPreview && (
                    <div className={`mb-1 pl-2 border-l text-[11px] text-muted-foreground line-clamp-1 ${isMine ? 'text-right border-l-0 border-r pr-2' : ''}`}>
                      <Reply className="w-3 h-3 inline mr-1" />
                      {m.replyPreview.senderName}: {m.replyPreview.body}
                    </div>
                  )}
                  <div className={`inline-block rounded px-3 py-2 text-sm whitespace-pre-wrap break-words shadow-sm space-y-2 ${isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
                    {m.body}
                    {m.imageUrl && (
                      <div
                        className='relative w-full max-h-64 h-48 cursor-pointer hover:opacity-90 transition'
                        onClick={() => openImageModal(m.imageUrl!, 'Chat attachment')}
                      >
                        <Image src={m.imageUrl} alt='attachment' fill className='object-contain rounded border' unoptimized />
                        <div className='absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition bg-black/20 rounded'>
                          <div className='bg-white/90 px-3 py-1 rounded-full text-sm font-medium'>🔍 Click to enlarge</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        <div className='border-t p-3 space-y-2'>
          {/* Banner indikator jualan di chat tradable */}
          {myItems.length > 0 && roomInfo?.isTradable && (
            <>
              <div className="mb-3">
                <div className="flex items-center gap-2 p-3 rounded bg-gradient-to-r from-yellow-400 via-orange-300 to-pink-300 text-sm font-semibold text-gray-900 shadow border border-yellow-500">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mr-2 text-orange-600"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V5a1 1 0 00-1-1H9a1 1 0 00-1 1v6M5 11h14M5 11v6a1 1 0 001 1h12a1 1 0 001-1v-6" /></svg>
                  <span>TRADABLE ROOM: Gunakan button "Jual Item" untuk jual item baru langsung!</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Isi form nama item, harga, game, deskripsi, dan upload foto (max 8) untuk broadcast ke chat.</div>
              </div>
              <div className='flex gap-2 mb-2'>
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
                <Button type='button' disabled={!postListingItemId || postListingItemId === '__none' || sending} onClick={async () => {
                  if (!postListingItemId) return;
                  setSending(true);
                  try {
                    // Kirim item sebagai pesan bubble khusus
                    const res = await fetch('/api/community/messages', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        room: slug,
                        itemId: postListingItemId,
                        type: 'PRODUCT',
                      })
                    });
                    if (res.ok) {
                      setPostListingItemId('');
                      const msg = await res.json();
                      setMessages(prev => merge(prev, { ...msg, createdAt: msg.createdAt, roomSlug: slug }))
                      scrollToBottom()
                    }
                  } finally {
                    setSending(false);
                  }
                }}>Kirim Produk</Button>
                <Button type='button' variant='secondary' disabled={!postListingItemId || postListingItemId === '__none' || sending}
                  onClick={()=> setSellModalOpen(true)}
                >Jual Produk</Button>
              </div>
            </>
          )}
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
            <div className='flex gap-2'>
              <Button disabled={!currentUserId || sending || (!input.trim() && !imageFile)} onClick={send}>{currentUserId ? (sending ? 'Mengirim...' : 'Kirim') : 'Login dulu'}</Button>
              {currentUserId && roomInfo?.isTradable && (
                <Button 
                  variant='outline' 
                  disabled={sending}
                  onClick={() => setQuickSellOpen(true)}
                >
                  Jual Item
                </Button>
              )}
            </div>
            {quickSellOpen && currentUserId && roomInfo?.isTradable && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                  <button className="absolute top-2 right-2 text-lg" onClick={() => setQuickSellOpen(false)}>✕</button>
                  <h2 className="text-lg font-bold mb-4">Jual Item Baru</h2>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!quickSellForm.name || !quickSellForm.price) return;
                    
                    setSending(true);
                    try {
                      // Convert images to base64
                      const imagePromises = quickSellForm.images.map(file => {
                        return new Promise<string>((resolve) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(reader.result as string);
                          reader.readAsDataURL(file);
                        });
                      });
                      const imageUrls = await Promise.all(imagePromises);
                      
                      const res = await fetch('/api/community/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          room: slug,
                          body: `🛒 **${quickSellForm.name}**\n💰 ${quickSellForm.currency} ${quickSellForm.price.toLocaleString()}\n🎮 Game: ${quickSellForm.game}\n📝 ${quickSellForm.description}`,
                          type: 'QUICK_SELL',
                          itemData: {
                            ...quickSellForm,
                            images: imageUrls,
                          },
                        })
                      });
                      if (res.ok) {
                        const msg = await res.json();
                        setMessages(prev => merge(prev, { ...msg, createdAt: msg.createdAt, roomSlug: slug }))
                        scrollToBottom()
                        setQuickSellOpen(false)
                        setQuickSellForm({ name: '', price: '', currency: 'Rp', description: '', game: '', images: [] })
                        setImagePreviewIdx(0)
                      }
                    } finally {
                      setSending(false);
                    }
                  }} className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Nama Item</label>
                      <input 
                        type="text" 
                        className="w-full border rounded px-3 py-2" 
                        value={quickSellForm.name} 
                        onChange={e => setQuickSellForm(f => ({ ...f, name: e.target.value }))} 
                        required 
                        maxLength={80} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Harga</label>
                      <div className="flex gap-2">
                        <Select value={quickSellForm.currency} onValueChange={(value) => setQuickSellForm(f => ({ ...f, currency: value }))}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Rp">Rp</SelectItem>
                            <SelectItem value="RM">RM</SelectItem>
                            <SelectItem value="$">$</SelectItem>
                            <SelectItem value="€">€</SelectItem>
                            <SelectItem value="£">£</SelectItem>
                            <SelectItem value="¥">¥</SelectItem>
                          </SelectContent>
                        </Select>
                        <input 
                          type="number" 
                          className="flex-1 border rounded px-3 py-2" 
                          value={quickSellForm.price} 
                          onChange={e => setQuickSellForm(f => ({ ...f, price: e.target.value }))} 
                          required 
                          min={0} 
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Game</label>
                      <input 
                        type="text" 
                        className="w-full border rounded px-3 py-2" 
                        value={quickSellForm.game} 
                        onChange={e => setQuickSellForm(f => ({ ...f, game: e.target.value }))} 
                        required 
                        maxLength={50} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Deskripsi</label>
                      <textarea 
                        className="w-full border rounded px-3 py-2" 
                        value={quickSellForm.description} 
                        onChange={e => setQuickSellForm(f => ({ ...f, description: e.target.value }))} 
                        rows={3} 
                        maxLength={200} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Upload Foto (max 8)</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="w-full" 
                        onChange={e => handleQuickSellImages(e.target.files)} 
                      />
                      {quickSellForm.images.length > 0 && (
                        <div className="mt-2 flex gap-2 items-center">
                          <button 
                            type="button" 
                            className="px-2 py-1 border rounded hover:bg-muted" 
                            disabled={imagePreviewIdx <= 0} 
                            onClick={() => setImagePreviewIdx(i => i - 1)}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <img 
                            src={URL.createObjectURL(quickSellForm.images[imagePreviewIdx])} 
                            alt="preview" 
                            className="h-16 w-16 object-cover rounded border" 
                          />
                          <button 
                            type="button" 
                            className="px-2 py-1 border rounded hover:bg-muted" 
                            disabled={imagePreviewIdx >= quickSellForm.images.length - 1} 
                            onClick={() => setImagePreviewIdx(i => i + 1)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <span className="text-xs">{imagePreviewIdx + 1}/{quickSellForm.images.length}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button type="submit" disabled={sending} className="flex-1">Kirim ke Chat</Button>
                      <Button type="button" variant="outline" onClick={() => setQuickSellOpen(false)}>Batal</Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Modal untuk preview gambar */}
      {imageModalOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={() => setImageModalOpen(false)}>
          <div className="relative w-full h-full flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {/* Zoom Controls */}
            <div className="absolute top-4 left-4 flex gap-2 bg-black/50 rounded-lg p-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleZoom('out')}
                disabled={zoomLevel <= 0.25}
                className="text-white hover:bg-white/20"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleZoom('reset')}
                className="text-white hover:bg-white/20"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleZoom('in')}
                disabled={zoomLevel >= 3}
                className="text-white hover:bg-white/20"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <div className="text-white text-sm px-2 py-1 bg-white/10 rounded">
                {Math.round(zoomLevel * 100)}%
              </div>
            </div>

            {/* Close Button */}
            <button
              className="absolute top-4 right-4 bg-black/50 text-white px-3 py-2 rounded-full hover:bg-black/70 transition z-10"
              onClick={() => setImageModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Image Container */}
            <div
              className="relative max-w-full max-h-full overflow-hidden cursor-move"
              style={{
                cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <Image
                src={modalImageSrc}
                alt={modalImageAlt}
                width={800}
                height={600}
                className="max-w-none select-none"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                unoptimized
                draggable={false}
              />
            </div>

            {/* Zoom Hint */}
            {zoomLevel === 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg text-sm">
                💡 Klik gambar untuk zoom in/out • Drag untuk geser gambar
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal User Info */}
      {userInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button 
              className="absolute top-2 right-2 text-lg hover:text-gray-600" 
              onClick={() => setUserInfoModalOpen(false)}
            >
              ✕
            </button>
            
            <h2 className="text-lg font-bold mb-4">User Info</h2>
            
            {userInfoLoading ? (
              <div className="text-center py-4">Loading...</div>
            ) : selectedUser ? (
              <div className="space-y-4">
                {selectedUser.error ? (
                  <div className="text-red-500 text-center py-4">{selectedUser.error}</div>
                ) : (
                  <>
                    {/* Avatar dan nama */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {selectedUser.avatar ? (
                          <Image 
                            src={selectedUser.avatar} 
                            alt={selectedUser.name} 
                            width={48} 
                            height={48} 
                            className="rounded-full object-cover" 
                          />
                        ) : (
                          <span className="text-lg font-semibold text-gray-600">
                            {selectedUser.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{selectedUser.name}</h3>
                        <p className="text-sm text-gray-500">@{selectedUser.username || 'user'}</p>
                      </div>
                    </div>

                    {/* Role dan Badge */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">Role & Badges</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.role && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedUser.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                            selectedUser.role === 'SELLER' ? 'bg-green-100 text-green-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {selectedUser.role}
                          </span>
                        )}
                        {selectedUser.badges && selectedUser.badges.map((badge: any, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            {badge.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold">{selectedUser.stats?.totalItems || 0}</div>
                        <div className="text-gray-500">Items Listed</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{selectedUser.stats?.totalSales || 0}</div>
                        <div className="text-gray-500">Sales</div>
                      </div>
                    </div>

                    {/* Bio */}
                    {selectedUser.bio && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-1">Bio</h4>
                        <p className="text-sm text-gray-600">{selectedUser.bio}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        onClick={() => handleAddFriend(selectedUser.id)}
                        className="flex-1"
                        variant="default"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Friend
                      </Button>
                      <Button 
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/messages/start', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ recipientId: selectedUser.id })
                            });
                            if (res.ok) {
                              const data = await res.json();
                              window.location.href = `/conversations/${data.conversationId}`;
                            } else {
                              const error = await res.json();
                              alert(error.message || 'Failed to start conversation');
                            }
                          } catch (e) {
                            console.error('Failed to start direct message:', e);
                            alert('Failed to start conversation');
                          }
                          setUserInfoModalOpen(false);
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal Jual Produk */}
      {sellModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-lg" onClick={()=>setSellModalOpen(false)}>
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-bold mb-2">Jual Produk</h2>
            <form onSubmit={handleSellSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Judul Produk</label>
                <input type="text" className="w-full border rounded px-2 py-1" value={sellForm.title} onChange={e=>handleSellInput('title',e.target.value)} required maxLength={80} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Upload Foto (max 5)</label>
                <input type="file" accept="image/*" multiple className="w-full" onChange={e=>handleSellImages(e.target.files)} />
                {sellForm.images.length > 0 && (
                  <div className="mt-2 flex gap-2 items-center">
                    <button type="button" className="px-2" disabled={sellPreviewIdx<=0} onClick={()=>setSellPreviewIdx(i=>i-1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <img src={URL.createObjectURL(sellForm.images[sellPreviewIdx])} alt="preview" className="h-16 w-16 object-cover rounded border" />
                    <button type="button" className="px-2" disabled={sellPreviewIdx>=sellForm.images.length-1} onClick={()=>setSellPreviewIdx(i=>i+1)}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-xs">{sellPreviewIdx+1}/{sellForm.images.length}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Harga</label>
                <input type="number" className="w-full border rounded px-2 py-1" value={sellForm.price} onChange={e=>handleSellInput('price',e.target.value)} required min={0} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Deskripsi</label>
                <textarea className="w-full border rounded px-2 py-1" value={sellForm.description} onChange={e=>handleSellInput('description',e.target.value)} rows={3} maxLength={500} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Hashtag (pisahkan dengan koma)</label>
                <input type="text" className="w-full border rounded px-2 py-1" value={sellForm.hashtags} onChange={e=>handleSellInput('hashtags',e.target.value)} maxLength={80} />
              </div>
              <div className="flex gap-2 mt-2">
                <Button type="submit" disabled={sending}>Jual Produk</Button>
                <Button type="button" variant="outline" onClick={()=>setSellModalOpen(false)}>Batal</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warning Modal for Existing Conversation */}
      <Dialog open={warningModalOpen} onOpenChange={setWarningModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Percakapan Sudah Ada</DialogTitle>
            <DialogDescription>
              {warningData?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleContinueConversation} className="flex-1">
              Lanjutkan Percakapan
            </Button>
            <Button onClick={handleCreateNewConversation} variant="outline" className="flex-1">
              Buat Percakapan Baru
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
