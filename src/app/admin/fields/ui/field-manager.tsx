"use client"
import { useEffect, useState } from 'react'

interface FieldDef {
  id: string
  key: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'SELECT'
  required: boolean
  order: number
  isActive: boolean
  options: string[] | null
}

export default function FieldManager() {
  const [fields, setFields] = useState<FieldDef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ key: '', label: '', type: 'TEXT', required: false, order: 0, options: '' })
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/fields?includeInactive=1')
      if (!res.ok) throw new Error('Gagal load')
      const data = await res.json()
      setFields(data)
      setError(null)
    } catch (e:any) {
      setError(e.message || 'Error')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function createField(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const payload: any = {
        key: form.key.trim(),
        label: form.label.trim(),
        type: form.type,
        required: form.required,
        order: Number(form.order) || 0
      }
      if (form.type === 'SELECT') {
        const opts = form.options.split(',').map(o=>o.trim()).filter(Boolean)
        payload.options = opts
      }
      const res = await fetch('/api/admin/fields', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const j = await res.json().catch(()=>({}))
        throw new Error(j.message || 'Gagal create')
      }
      setForm({ key: '', label: '', type: 'TEXT', required: false, order: 0, options: '' })
      await load()
    } catch (e:any) {
      alert(e.message)
    } finally { setCreating(false) }
  }

  async function toggleActive(f: FieldDef) {
    const res = await fetch('/api/admin/fields', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id, isActive: !f.isActive }) })
    if (res.ok) {
      setFields(prev => prev.map(p => p.id === f.id ? { ...p, isActive: !p.isActive } : p))
    }
  }

  async function updateOrder(f: FieldDef, delta: number) {
    const newOrder = f.order + delta
    const res = await fetch('/api/admin/fields', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id, order: newOrder }) })
    if (res.ok) {
      setFields(prev => prev.map(p => p.id === f.id ? { ...p, order: newOrder } : p).sort((a,b)=>a.order-b.order))
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Kolom Dinamis</h1>
      <form onSubmit={createField} className="grid gap-2 md:grid-cols-6 items-end border p-4 rounded">
        <div className="flex flex-col col-span-2">
          <label className="text-xs font-medium">Kunci</label>
          <input className="border rounded px-2 py-1 text-sm" value={form.key} onChange={e=>setForm(f=>({...f,key:e.target.value}))} required pattern="[a-z0-9_]+" />
        </div>
        <div className="flex flex-col col-span-2">
          <label className="text-xs font-medium">Label</label>
          <input className="border rounded px-2 py-1 text-sm" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} required />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium">Tipe</label>
          <select className="border rounded px-2 py-1 text-sm" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value, options:''}))}>
            <option value="TEXT">TEKS</option>
            <option value="NUMBER">ANGKA</option>
            <option value="SELECT">PILIHAN</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium">Urutan</label>
          <input type="number" className="border rounded px-2 py-1 text-sm" value={form.order} onChange={e=>setForm(f=>({...f,order:e.target.value as any}))} />
        </div>
        {form.type === 'SELECT' && (
          <div className="flex flex-col col-span-2">
            <label className="text-xs font-medium">Options (comma)</label>
            <input className="border rounded px-2 py-1 text-sm" value={form.options} onChange={e=>setForm(f=>({...f,options:e.target.value}))} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium flex items-center gap-1"><input type="checkbox" checked={form.required} onChange={e=>setForm(f=>({...f,required:e.target.checked}))}/> Required</label>
        </div>
        <button disabled={creating} className="col-span-full md:col-span-1 bg-primary text-primary-foreground rounded px-3 py-1 text-sm disabled:opacity-50">{creating? 'Saving...' : 'Add'}</button>
      </form>

      {loading ? <div className="text-sm">Loading...</div> : error ? <div className="text-sm text-red-500">{error}</div> : (
        <table className="w-full text-sm border">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left">Order</th>
              <th className="p-2 text-left">Key</th>
              <th className="p-2 text-left">Label</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Req</th>
              <th className="p-2 text-left">Active</th>
              <th className="p-2 text-left">Options</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.sort((a,b)=>a.order-b.order).map(f => (
              <tr key={f.id} className="border-t">
                <td className="p-2">{f.order}</td>
                <td className="p-2 font-mono text-xs">{f.key}</td>
                <td className="p-2">{f.label}</td>
                <td className="p-2">{f.type}</td>
                <td className="p-2">{f.required? '✔' : ''}</td>
                <td className="p-2"><button onClick={()=>toggleActive(f)} className={`text-xs px-2 py-0.5 rounded border ${f.isActive? 'bg-green-600 text-white' : ''}`}>{f.isActive? 'ON':'OFF'}</button></td>
                <td className="p-2 text-xs max-w-[160px] truncate">{f.options?.join(', ')}</td>
                <td className="p-2 flex gap-1">
                  <button onClick={()=>updateOrder(f,-1)} className="border rounded px-2 text-xs">↑</button>
                  <button onClick={()=>updateOrder(f,1)} className="border rounded px-2 text-xs">↓</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
