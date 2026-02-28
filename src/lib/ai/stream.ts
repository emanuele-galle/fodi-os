/**
 * SSE stream helpers for AI chat responses.
 */

export type ThinkingBudgetTokens = { low: number; medium: number; high: number }

export const THINKING_BUDGETS: ThinkingBudgetTokens = {
  low: 2048,
  medium: 5120,
  high: 10240,
}

export interface AiStreamEvent {
  type: 'text_delta' | 'thinking_delta' | 'thinking_done' | 'tool_use_start' | 'tool_result' | 'tool_progress' | 'suggested_followups' | 'error' | 'done'
  data: unknown
}

export function encodeSSE(event: AiStreamEvent): Uint8Array {
  const payload = `data: ${JSON.stringify(event)}\n\n`
  return new TextEncoder().encode(payload)
}

export function createAiStream(
  onCancel?: () => void,
): { stream: ReadableStream; controller: ReadableStreamDefaultController | null; enqueue: (event: AiStreamEvent) => void; close: () => void } {
  let ctrl: ReadableStreamDefaultController | null = null

  const stream = new ReadableStream({
    start(controller) {
      ctrl = controller
    },
    cancel() {
      onCancel?.()
    },
  })

  return {
    stream,
    get controller() { return ctrl },
    enqueue(event: AiStreamEvent) {
      try {
        ctrl?.enqueue(encodeSSE(event))
      } catch {
        // Client disconnected
      }
    },
    close() {
      try {
        ctrl?.enqueue(encodeSSE({ type: 'done', data: null }))
        ctrl?.close()
      } catch {
        // Already closed
      }
    },
  }
}
