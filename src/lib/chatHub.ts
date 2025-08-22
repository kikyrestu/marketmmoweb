// In-memory SSE chat hub. Temporary until WebSocket/Redis implementation.
export type ChatMessageEvent = {
  type: 'message.new'
  conversationId: string
  message: { id: string; body: string; createdAt: string; senderId: string }
}

export type ConversationUpdateEvent = {
  type: 'conversation.update'
  conversationId: string
  lastMessage: { id: string; body: string; createdAt: string; senderId: string } | null
  unreadCount: number
}

export type ReadUpdateEvent = {
  type: 'read.update'
  conversationId: string
  unreadCount: number
}

export type CommunityMessageEvent = {
  type: 'community.message.new'
  message: { id: string; body: string; createdAt: string; senderId: string; senderName: string; replyToId?: string | null; replyPreview?: { id: string; body: string; senderName: string } | null; imageUrl?: string | null }
}

export type ChatEvent = ChatMessageEvent | ConversationUpdateEvent | ReadUpdateEvent | CommunityMessageEvent | { type: 'ping' }

type Client = {
  userId: string
  write: (event: ChatEvent) => void
  close: () => void
}

class ChatHub {
  private clients: Set<Client> = new Set()
  private pingInterval: NodeJS.Timeout | null = null

  constructor() { this.ensurePing() }

  private ensurePing() {
    if (this.pingInterval) return
    this.pingInterval = setInterval(() => { this.broadcastAll({ type: 'ping' }) }, 25000)
  }

  subscribe(userId: string, controller: ReadableStreamDefaultController) {
    const encoder = new TextEncoder()
    const write = (event: ChatEvent) => {
      const payload = `event: ${event.type}\n` + `data: ${JSON.stringify(event)}\n\n`
      controller.enqueue(encoder.encode(payload))
    }
    const client: Client = {
      userId,
      write,
      close: () => {
        this.clients.delete(client)
        try { controller.close() } catch {}
      }
    }
    this.clients.add(client)
    write({ type: 'ping' })
    return client
  }

  broadcastToUsers(userIds: string[], eventFactory: (userId: string) => ChatEvent) {
    for (const c of this.clients) {
      if (userIds.includes(c.userId)) {
        try { c.write(eventFactory(c.userId)) } catch {}
      }
    }
  }

  broadcastAll(event: ChatEvent) {
    for (const c of this.clients) { try { c.write(event) } catch {} }
  }
}

const g = globalThis as any
export const chatHub: ChatHub = g.__CHAT_HUB__ || (g.__CHAT_HUB__ = new ChatHub())
