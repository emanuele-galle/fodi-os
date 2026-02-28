'use client'

import { useState, useCallback, useRef } from 'react'

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: { id: string; name: string; status?: string }[]
  createdAt: string
}

interface UseAiChatReturn {
  messages: AiChatMessage[]
  isLoading: boolean
  conversationId: string | null
  error: string | null
  suggestedFollowups: string[]
  sendMessage: (text: string) => Promise<void>
  setConversationId: (id: string | null) => void
  loadConversation: (id: string) => Promise<void>
  clearMessages: () => void
}

export function useAiChat(): UseAiChatReturn {
  const [messages, setMessages] = useState<AiChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    setError(null)
    setSuggestedFollowups([])

    // Add user message immediately
    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    // Add placeholder assistant message
    const assistantId = `assistant-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', toolCalls: [], createdAt: new Date().toISOString() },
    ])

    try {
      abortRef.current = new AbortController()

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Errore ${res.status}`)
      }

      // Read SSE stream
      const reader = res.body?.getReader()
      if (!reader) throw new Error('Stream non disponibile')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'text_delta') {
              if (event.data.conversationId && !conversationId) {
                setConversationId(event.data.conversationId)
              }
              if (event.data.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + event.data.text } : m
                  )
                )
              }
            } else if (event.type === 'tool_use_start') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, toolCalls: [...(m.toolCalls || []), { id: event.data.id, name: event.data.name, status: 'running' }] }
                    : m
                )
              )
            } else if (event.type === 'tool_result') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        toolCalls: (m.toolCalls || []).map((tc) =>
                          tc.id === event.data.id ? { ...tc, status: event.data.status } : tc
                        ),
                      }
                    : m
                )
              )
            } else if (event.type === 'suggested_followups') {
              setSuggestedFollowups(event.data.suggestions || [])
            } else if (event.type === 'error') {
              setError(event.data.message)
            }
          } catch {
            // Skip malformed SSE
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message)
        // Remove empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.length > 0))
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [isLoading, conversationId])

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}`)
      if (!res.ok) throw new Error('Errore caricamento')
      const { data } = await res.json()

      setConversationId(id)
      setSuggestedFollowups([])
      setMessages(
        data.messages
          .filter((m: { role: string }) => m.role === 'USER' || m.role === 'ASSISTANT')
          .map((m: { id: string; role: string; content: string; toolCalls: unknown; createdAt: string }) => ({
            id: m.id,
            role: m.role === 'USER' ? 'user' : 'assistant',
            content: m.content,
            toolCalls: Array.isArray(m.toolCalls) ? m.toolCalls : [],
            createdAt: m.createdAt,
          }))
      )
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setConversationId(null)
    setError(null)
    setSuggestedFollowups([])
    abortRef.current?.abort()
  }, [])

  return {
    messages,
    isLoading,
    conversationId,
    error,
    suggestedFollowups,
    sendMessage,
    setConversationId,
    loadConversation,
    clearMessages,
  }
}
