// In-memory SSE notification hub for offers and chat messages.
export type OfferEvent = {
  type: 'offer.new'
  conversationId: string
  offer: { id: string; amount: number; createdById: string }
}

export type ChatNotifyEvent = {
  type: 'chat.message'
  conversationId: string
  message: { id: string; body: string; senderId: string }
}

export type NotificationEvent = OfferEvent | ChatNotifyEvent | { type: 'ping' }

type Client = {
  userId: string
  write: (event: NotificationEvent) => void
  close: () => void
}

class NotificationHub {
  private clients: Set<Client> = new Set()
  private pingInterval: NodeJS.Timeout | null = null

  constructor() { this.ensurePing() }

  private ensurePing() {
    if (this.pingInterval) return
    this.pingInterval = setInterval(() => { this.broadcastAll({ type: 'ping' }) }, 25000)
  }

  subscribe(userId: string, controller: ReadableStreamDefaultController) {
    const encoder = new TextEncoder()
    const write = (event: NotificationEvent) => {
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

  broadcastToUsers(userIds: string[], eventFactory: (userId: string) => NotificationEvent) {
    for (const c of this.clients) {
      if (userIds.includes(c.userId)) {
        try { c.write(eventFactory(c.userId)) } catch {}
      }
    }
  }

  broadcastAll(event: NotificationEvent) {
    for (const c of this.clients) { try { c.write(event) } catch {} }
  }
}

const g = globalThis as any
export const notificationHub: NotificationHub = g.__NOTIF_HUB__ || (g.__NOTIF_HUB__ = new NotificationHub())
