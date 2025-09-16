"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Escrow {
  id: string
  status: string
  totalAmount: number
  fee: number
  createdAt: string
  conversationId: string
  buyer: { name: string } | null
  seller: { name: string } | null
}

interface EscrowTableProps {
  escrows: Escrow[]
}

export function EscrowTable({ escrows }: EscrowTableProps) {
  const [joiningChats, setJoiningChats] = useState<Set<string>>(new Set())

  const handleJoinChat = async (conversationId: string, escrowId: string) => {
    if (joiningChats.has(escrowId)) return

    setJoiningChats(prev => new Set(prev).add(escrowId))

    try {
      const res = await fetch(`/api/conversations/${conversationId}/join-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (res.ok) {
        toast.success('Berhasil bergabung ke chat room')
        // Redirect to chat
        window.open(`/conversations/${conversationId}`, '_blank')
      } else {
        const error = await res.json()
        toast.error(error.message || 'Gagal bergabung ke chat')
      }
    } catch (error) {
      console.error('Join chat error:', error)
      toast.error('Gagal bergabung ke chat')
    } finally {
      setJoiningChats(prev => {
        const newSet = new Set(prev)
        newSet.delete(escrowId)
        return newSet
      })
    }
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-accent">
          <tr className="text-left">
            <th className="p-2">ID</th>
            <th className="p-2">Status</th>
            <th className="p-2">Jumlah</th>
            <th className="p-2">Biaya</th>
            <th className="p-2">Dibuat</th>
            <th className="p-2">Ruang Chat</th>
            <th className="p-2">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {escrows.map(e => (
            <tr key={e.id} className="border-t">
              <td className="p-2 font-mono text-xs">{e.id.slice(0,8)}…</td>
              <td className="p-2"><span className="inline-flex items-center rounded px-2 py-1 border text-[10px]">{e.status}</span></td>
              <td className="p-2">Rp {e.totalAmount?.toLocaleString()}</td>
              <td className="p-2">Rp {e.fee?.toLocaleString()}</td>
              <td className="p-2 text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</td>
              <td className="p-2">
                {e.conversationId && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleJoinChat(e.conversationId, e.id)}
                      disabled={joiningChats.has(e.id)}
                    >
                      {joiningChats.has(e.id) ? 'Bergabung...' : 'Bergabung ke Chat'}
                    </Button>
                    <Link href={`/conversations/${e.conversationId}`} target="_blank">
                      <Button size="sm" variant="ghost">Lihat</Button>
                    </Link>
                  </div>
                )}
              </td>
              <td className="p-2"><Link href={`/admin/escrow/${e.id}`} className="underline">Detail</Link></td>
            </tr>
          ))}
          {escrows.length === 0 && (
            <tr>
              <td className="p-6 text-center text-muted-foreground" colSpan={7}>Belum ada kasus escrow</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
