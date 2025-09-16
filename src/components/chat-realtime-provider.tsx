"use client"
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

type MessageNew = { type: 'message.new'; conversationId: string; message: { id: string; body: string; createdAt: string; senderId: string; imageUrl?: string | null; sender?: { role?: string; name?: string } } }
type ConvUpdate = { type: 'conversation.update'; conversationId: string; lastMessage: { id: string; body: string; createdAt: string; senderId: string; imageUrl?: string | null }; unreadCount: number }
type ReadUpdate = { type: 'read.update'; conversationId: string; unreadCount: number }
type CommunityNew = { type: 'community.message.new'; message: { id: string; body: string; createdAt: string; senderId: string; senderName: string; replyToId?: string | null; replyPreview?: { id: string; body: string; senderName: string } | null; imageUrl?: string | null; roomId?: string | null; roomSlug?: string | null } }
type Ping = { type: 'ping' }
type EventUnion = MessageNew | ConvUpdate | ReadUpdate | CommunityNew | Ping

interface Ctx {
  connected: boolean
  conversationUpdates: Record<string, { lastMessage?: ConvUpdate['lastMessage']; unreadCount: number }>
  registerMessageHandler: (fn: (e: MessageNew) => void) => void
  registerCommunityHandler: (fn: (e: CommunityNew) => void) => void
}

const ChatRealtimeContext = createContext<Ctx | undefined>(undefined)

export const ChatRealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false)
  const [conversationUpdates, setConversationUpdates] = useState<Ctx['conversationUpdates']>({})
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef(0)
  const msgHandlerRef = useRef<((e: MessageNew) => void) | null>(null)
  const communityHandlerRef = useRef<((e: CommunityNew) => void) | null>(null)

  const connect = useCallback(() => {
    esRef.current?.close()
    const es = new EventSource('/api/chat/stream')
    esRef.current = es
    es.onopen = () => { setConnected(true); retryRef.current = 0 }
    es.onerror = () => {
      setConnected(false)
      es.close()
      const delay = Math.min(10000, 500 * 2 ** retryRef.current++)
      setTimeout(connect, delay)
    }
    const parse = (e: MessageEvent): EventUnion | null => { try { return JSON.parse(e.data) } catch { return null } }
    es.addEventListener('message.new', (e) => { const data = parse(e as MessageEvent); if (data && data.type === 'message.new') msgHandlerRef.current?.(data) })
    es.addEventListener('conversation.update', (e) => {
      const data = parse(e as MessageEvent)
      if (data && data.type === 'conversation.update') {
        setConversationUpdates(prev => ({
          ...prev,
          [data.conversationId]: {
            ...(prev[data.conversationId] || {}),
            lastMessage: data.lastMessage,
            unreadCount: data.unreadCount
          }
        }))
      }
    })
    es.addEventListener('community.message.new', (e) => {
      const data = parse(e as MessageEvent)
      if (data && data.type === 'community.message.new') {
        communityHandlerRef.current?.(data)
      }
    })
    es.addEventListener('read.update', (e) => {
      const data = parse(e as MessageEvent)
      if (data && data.type === 'read.update') {
        setConversationUpdates(prev => ({
          ...prev,
            [data.conversationId]: {
              ...(prev[data.conversationId] || {}),
              unreadCount: data.unreadCount
            }
        }))
      }
    })
  }, [])

  useEffect(() => { connect(); return () => { esRef.current?.close() } }, [connect])

  const registerMessageHandler = (fn: (e: MessageNew) => void) => { msgHandlerRef.current = fn }
  const registerCommunityHandler = (fn: (e: CommunityNew) => void) => { communityHandlerRef.current = fn }

  return (
  <ChatRealtimeContext.Provider value={{ connected, conversationUpdates, registerMessageHandler, registerCommunityHandler }}>
      {children}
    </ChatRealtimeContext.Provider>
  )
}

export const useChatRealtime = () => {
  const ctx = useContext(ChatRealtimeContext)
  if (!ctx) throw new Error('useChatRealtime must be used within ChatRealtimeProvider')
  return ctx
}
