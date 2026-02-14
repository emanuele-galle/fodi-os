export interface SSEEvent {
  type: string
  data: unknown
}

class SSEManager {
  private clients: Map<string, Set<ReadableStreamDefaultController>>

  constructor() {
    this.clients = new Map()
  }

  addClient(userId: string, controller: ReadableStreamDefaultController) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set())
    }
    this.clients.get(userId)!.add(controller)
  }

  removeClient(userId: string, controller: ReadableStreamDefaultController) {
    const controllers = this.clients.get(userId)
    if (controllers) {
      controllers.delete(controller)
      if (controllers.size === 0) {
        this.clients.delete(userId)
      }
    }
  }

  broadcast(channelId: string, memberUserIds: string[], event: SSEEvent) {
    const payload = `data: ${JSON.stringify({ ...event, channelId })}\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(payload)

    for (const userId of memberUserIds) {
      const controllers = this.clients.get(userId)
      if (controllers) {
        for (const controller of controllers) {
          try {
            controller.enqueue(encoded)
          } catch {
            // Client disconnected, will be cleaned up
          }
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

    const payload = `data: ${JSON.stringify(event)}\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(payload)

    for (const controller of controllers) {
      try {
        controller.enqueue(encoded)
      } catch {
        // Client disconnected
      }
    }
  }
}

const globalForSSE = globalThis as unknown as { sseManager: SSEManager }

export const sseManager = globalForSSE.sseManager ?? new SSEManager()

if (process.env.NODE_ENV !== 'production') {
  globalForSSE.sseManager = sseManager
}
