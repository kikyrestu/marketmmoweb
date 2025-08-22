"use client"
import { useState, useEffect } from 'react'

interface Room {
  id: string
  name: string
  slug: string
  imageUrl?: string | null
  tags: string[]
  wordFilter: string[]
  gameName?: string | null
  isTradable?: boolean
  createdAt: string
  _count?: { members: number; messages: number }
}

export default function CommunityRoomsAdminPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    tags: '',
    wordFilter: '',
    gameName: '',
  image: null as File | null,
  isTradable: 'NO' as 'YES' | 'NO',
  status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  })

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/community-rooms')
      const data = await res.json()
      setRooms(data)
    } catch (e: any) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  async function createRoom(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      if (form.slug) fd.append('slug', form.slug)
    fd.append('tags', form.tags)
      fd.append('wordFilter', form.wordFilter)
  if (form.gameName) fd.append('gameName', form.gameName)
  if (form.image) fd.append('image', form.image)
  fd.append('isTradable', form.isTradable === 'YES' ? 'true' : 'false')
  fd.append('status', form.status)
      const res = await fetch('/api/admin/community-rooms', { method: 'POST', body: fd })
      if (!res.ok) {
        const j = await res.json().catch(()=>({}))
        throw new Error(j.message || 'Gagal create room')
      }
  setForm({ name:'', slug:'', tags:'', wordFilter:'', gameName:'', image:null, isTradable:'NO', status:'DRAFT' })
      await load()
    } catch (e:any) {
      alert(e.message)
    } finally { setCreating(false) }
  }
  async function setStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') {
    await fetch('/api/admin/community-rooms', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    await load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Community Rooms</h1>
          <p className="text-xs text-muted-foreground">Buat & kelola room chat komunitas khusus.</p>
        </div>
      </div>
  <form onSubmit={createRoom} className="grid gap-3 md:grid-cols-6 border rounded p-4 text-sm">
        <div className="flex flex-col col-span-2">
          <label className="text-[11px] font-medium">Nama</label>
          <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="border rounded px-2 py-1" />
        </div>
        <div className="flex flex-col col-span-2">
          <label className="text-[11px] font-medium">Slug (optional)</label>
            <input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} placeholder="auto-dari-nama" className="border rounded px-2 py-1" pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" title="lowercase, angka, dan dash (contoh: room-mlbb-indo)" />
        </div>
        <div className="flex flex-col col-span-2">
          <label className="text-[11px] font-medium">Game Name</label>
          <input value={form.gameName} onChange={e=>setForm(f=>({...f,gameName:e.target.value}))} className="border rounded px-2 py-1" />
        </div>
        <div className="flex flex-col md:col-span-3">
          <label className="text-[11px] font-medium">Tags (comma)</label>
          <input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} className="border rounded px-2 py-1" />
        </div>
        <div className="flex flex-col md:col-span-3">
          <label className="text-[11px] font-medium">Word Filter (comma)</label>
          <input value={form.wordFilter} onChange={e=>setForm(f=>({...f,wordFilter:e.target.value}))} className="border rounded px-2 py-1" placeholder="kata1,kata2" />
        </div>
  {/* Removed User IDs pre-add; rooms are public so this isn\'t necessary */}
        <div className="flex flex-col md:col-span-3">
          <label className="text-[11px] font-medium">Image</label>
          <input type="file" accept="image/*" onChange={e=>setForm(f=>({...f,image:e.target.files?.[0]||null}))} className="text-xs" />
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] font-medium">Tradable</label>
          <select value={form.isTradable} onChange={e=> setForm(f=> ({...f, isTradable: e.target.value as any}))} className="border rounded px-2 py-1">
            <option value="NO">Non-tradable</option>
            <option value="YES">Tradable</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] font-medium">Status</label>
          <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as any}))} className="border rounded px-2 py-1">
            <option value="DRAFT">DRAFT</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <div className="md:col-span-6 flex gap-2 items-center">
          <button disabled={creating} className="bg-primary text-primary-foreground rounded px-4 py-1.5 disabled:opacity-50">{creating? 'Saving...' : 'Create Room'}</button>
        </div>
      </form>
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Daftar Room</h2>
        {loading ? <div className="text-xs">Loading...</div> : (
          <table className="w-full text-xs border">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left">Nama</th>
                <th className="p-2 text-left">Slug</th>
                <th className="p-2 text-left">Game</th>
                <th className="p-2 text-left">Tags</th>
                <th className="p-2 text-left">Filter</th>
                <th className="p-2 text-left">Tradable</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Members</th>
                <th className="p-2 text-left">Msgs</th>
                <th className="p-2 text-left">Created</th>
                <th className="p-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.slug}</td>
                  <td className="p-2">{r.gameName||'-'}</td>
                  <td className="p-2 max-w-[140px] truncate">{r.tags.join(', ')}</td>
                  <td className="p-2 max-w-[140px] truncate">{r.wordFilter.join(', ')}</td>
                  <td className="p-2">{r.isTradable ? 'YES' : 'NO'}</td>
                  <td className="p-2 max-w-[100px] truncate uppercase">{(r as any).status || 'PUBLISHED'}</td>
                  <td className="p-2">{r._count?.members ?? 0}</td>
                  <td className="p-2">{r._count?.messages ?? 0}</td>
                  <td className="p-2">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="p-2 flex gap-1 items-center">
                    <a href={`/community/rooms/${r.slug}`} target="_blank" className="text-xs px-2 py-1 border rounded hover:bg-accent">Open</a>
                    <button onClick={()=>setStatus(r.id, 'PUBLISHED')} className="text-xs px-2 py-1 border rounded hover:bg-green-600 hover:text-white">Publish</button>
                    <button onClick={()=>setStatus(r.id, 'DRAFT')} className="text-xs px-2 py-1 border rounded hover:bg-yellow-600 hover:text-white">Draft</button>
                    <button onClick={()=>setStatus(r.id, 'ARCHIVED')} className="text-xs px-2 py-1 border rounded hover:bg-gray-600 hover:text-white">Archive</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
