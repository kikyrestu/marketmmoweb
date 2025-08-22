"use client"

import React, { useEffect } from 'react'
import { toast } from 'sonner'

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const es = new EventSource('/api/notifications/stream')
    const parse = (e: MessageEvent) => { try { return JSON.parse(e.data) } catch { return null } }
    es.addEventListener('offer.new', (e) => {
      const data = parse(e as MessageEvent)
      if (data && data.type === 'offer.new') {
        toast(`New offer: $${data.offer.amount}`)
      }
    })
    es.addEventListener('chat.message', (e) => {
      const data = parse(e as MessageEvent)
      if (data && data.type === 'chat.message') {
        toast(data.message.body)
      }
    })
    return () => { es.close() }
  }, [])
  return <>{children}</>
}
