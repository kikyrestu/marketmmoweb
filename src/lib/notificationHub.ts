// In-memory SSE notification hub for offers, chat messages, and system notifications.
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

export type NotificationEvent = {
  type: 'notification.new'
  notification: {
    id: string
    type: string
    title: string
    message: string
    createdAt: string
  }
}

export type EscrowEvent = {
  type: 'escrow.request'
  conversationId: string
  escrow: {
    id: string
    buyerId: string
    sellerId: string
    itemId: string
    itemName: string
    amount: number
    requestedById: string
  }
}

export type EscrowResponseEvent = {
  type: 'escrow.response'
  conversationId: string
  escrow: {
    id: string
    buyerId: string
    sellerId: string
    action: 'accept' | 'reject'
    respondedById: string
  }
}

export type EscrowConfirmEvent = {
  type: 'escrow.confirm'
  conversationId: string
  escrow: {
    id: string
    buyerId: string
    sellerId: string
    confirmedById: string
  }
}

export type EscrowFinalConfirmEvent = {
  type: 'escrow.final_confirm'
  conversationId: string
  escrow: {
    id: string
    buyerId: string
    sellerId: string
    confirmedById: string
  }
}

export type SystemEvent = { type: 'ping' }

export type HubEvent = OfferEvent | ChatNotifyEvent | NotificationEvent | EscrowEvent | EscrowResponseEvent | EscrowConfirmEvent | EscrowFinalConfirmEvent | SystemEvent

type Client = {
  userId: string
  write: (event: HubEvent) => void
  close: () => void
}

class NotificationHub {
  private clients: Set<Client> = new Set()
  private pingInterval: NodeJS.Timeout | null = null

  constructor() { this.ensurePing() }

  private ensurePing() {
    if (this.pingInterval) return
    this.pingInterval = setInterval(() => { this.broadcastAll({ type: 'ping' } as SystemEvent) }, 25000)
  }

  subscribe(userId: string, controller: ReadableStreamDefaultController) {
    const encoder = new TextEncoder()
    const write = (event: HubEvent) => {
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
    write({ type: 'ping' } as SystemEvent)
    return client
  }

  broadcastToUsers(userIds: string[], eventFactory: (userId: string) => HubEvent) {
    for (const c of this.clients) {
      if (userIds.includes(c.userId)) {
        try { c.write(eventFactory(c.userId)) } catch {}
      }
    }
  }

  broadcastAll(event: HubEvent) {
    for (const c of this.clients) { try { c.write(event) } catch {} }
  }
}

const g = globalThis as any
export const notificationHub: NotificationHub = g.__NOTIF_HUB__ || (g.__NOTIF_HUB__ = new NotificationHub())
