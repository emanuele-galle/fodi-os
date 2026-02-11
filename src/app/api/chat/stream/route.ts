import { NextRequest } from 'next/server'
import { sseManager } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()
  let controllerRef: ReadableStreamDefaultController | null = null

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller
      sseManager.addClient(userId, controller)

      // Send connected event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 30000)

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        sseManager.removeClient(userId, controller)
        try { controller.close() } catch { /* already closed */ }
      })
    },
    cancel() {
      if (controllerRef) {
        sseManager.removeClient(userId, controllerRef)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
