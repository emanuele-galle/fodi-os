interface SSEEvent {
  type: string
  data: unknown
}

class SSEManager {
  private clients: Map<string, Set<ReadableStreamDefaultController>>
  private heartbeats: Map<ReadableStreamDefaultController, NodeJS.Timeout>

  constructor() {
    this.clients = new Map()
    this.heartbeats = new Map()
  }

  addClient(userId: string, controller: ReadableStreamDefaultController) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set())
    }
    this.clients.get(userId)!.add(controller)

    const intervalId = setInterval(() => {
      try {
        controller.enqueue(new TextEncoder().encode(':keepalive\n\n'))
      } catch {
        // Client disconnected — clean up immediately
        this.removeClient(userId, controller)
      }
    }, 15000)
    this.heartbeats.set(controller, intervalId)
  }

  removeClient(userId: string, controller: ReadableStreamDefaultController) {
    const heartbeat = this.heartbeats.get(controller)
    if (heartbeat) {
      clearInterval(heartbeat)
      this.heartbeats.delete(controller)
    }

    const controllers = this.clients.get(userId)
    if (controllers) {
      controllers.delete(controller)
      if (controllers.size === 0) {
        this.clients.delete(userId)
      }
    }
  }

  private safeSend(userId: string, controller: ReadableStreamDefaultController, data: Uint8Array): boolean {
    try {
      controller.enqueue(data)
      return true
    } catch {
      this.removeClient(userId, controller)
      return false
    }
  }

  broadcast(channelId: string, memberUserIds: string[], event: SSEEvent) {
    const encoded = new TextEncoder().encode(`data: ${JSON.stringify({ ...event, channelId })}\n\n`)

    for (const userId of memberUserIds) {
      const controllers = this.clients.get(userId)
      if (controllers) {
        for (const controller of Array.from(controllers)) {
          this.safeSend(userId, controller, encoded)
        }
      }
    }
  }

  isUserConnected(userId: string): boolean {
    const controllers = this.clients.get(userId)
    return !!controllers && controllers.size > 0
  }

  sendToUser(userId: string, event: SSEEvent) {
    const controllers = this.clients.get(userId)
    if (!controllers) return

    const encoded = new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)

    for (const controller of Array.from(controllers)) {
      this.safeSend(userId, controller, encoded)
    }
  }

  getConnectedUserIds(): string[] {
    return Array.from(this.clients.keys()).filter(
      (uid) => (this.clients.get(uid)?.size ?? 0) > 0
    )
  }

  broadcastToAll(event: SSEEvent) {
    const encoded = new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)

    for (const [userId, controllers] of this.clients) {
      for (const controller of Array.from(controllers)) {
        this.safeSend(userId, controller, encoded)
      }
    }
  }
}

const globalForSSE = globalThis as unknown as { sseManager: SSEManager }

export const sseManager = globalForSSE.sseManager ?? new SSEManager()

if (process.env.NODE_ENV !== 'production') {
  globalForSSE.sseManager = sseManager
}

// --- Real-time helpers ---

interface BadgeUpdate {
  notifications?: number
  chat?: number
  tasks?: number
}

export function sendBadgeUpdate(userId: string, badge: BadgeUpdate) {
  sseManager.sendToUser(userId, { type: 'badge_update', data: badge })
}

export function sendPresenceUpdate(userId: string, status: 'online' | 'offline') {
  sseManager.broadcastToAll({
    type: 'presence',
    data: { userId, status, timestamp: new Date().toISOString() },
  })
}

type DataEntity =
  | 'task' | 'notification' | 'ticket' | 'project' | 'calendar'
  | 'client' | 'lead' | 'deal' | 'expense' | 'income' | 'quote' | 'category'

export function sendDataChanged(userIds: string[], entity: DataEntity, id?: string) {
  for (const userId of userIds) {
    sseManager.sendToUser(userId, { type: 'data_changed', data: { entity, id } })
  }
}

export function broadcastDataChanged(entity: DataEntity, id?: string) {
  const userIds = sseManager.getConnectedUserIds()
  sendDataChanged(userIds, entity, id)
}
