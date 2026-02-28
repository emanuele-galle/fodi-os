'use client'

import { useState, useCallback, useRef } from 'react'

export interface AiToolCall {
  id: string
  name: string
  status?: string
  result?: { success: boolean; data?: unknown; error?: string }
}

export interface AiAttachment {
  url: string
  mimeType: string
  fileName: string
}

export interface AiChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  isThinking?: boolean
  toolCalls?: AiToolCall[]
  attachments?: AiAttachment[]
  createdAt: string
}

interface UseAiChatReturn {
  messages: AiChatMessage[]
  isLoading: boolean
  conversationId: string | null
  error: string | null
  suggestedFollowups: string[]
  activeToolName: string | null
  sendMessage: (text: string, currentPage?: string) => Promise<void>
  sendMessageWithFiles: (text: string, files: File[], currentPage?: string) => Promise<void>
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
  const [activeToolName, setActiveToolName] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const handleStream = useCallback(async (
    res: Response,
    assistantId: string,
    currentConversationId: string | null,
  // eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
  ) => {
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

          if (event.type === 'thinking_delta') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, thinking: (m.thinking || '') + event.data.text, isThinking: true } : m
              )
            )
          } else if (event.type === 'thinking_done') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isThinking: false } : m
              )
            )
          } else if (event.type === 'text_delta') {
            if (event.data.conversationId && !currentConversationId) {
              setConversationId(event.data.conversationId)
              currentConversationId = event.data.conversationId
            }
            if (event.data.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + event.data.text, isThinking: false } : m
                )
              )
            }
          } else if (event.type === 'tool_use_start') {
            setActiveToolName(event.data.name)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, toolCalls: [...(m.toolCalls || []), { id: event.data.id, name: event.data.name, status: 'running' }] }
                  : m
              )
            )
          } else if (event.type === 'tool_result') {
            setActiveToolName(null)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolCalls: (m.toolCalls || []).map((tc) =>
                        tc.id === event.data.id ? { ...tc, status: event.data.status, result: event.data.result } : tc
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
  }, [])

  const sendMessage = useCallback(async (text: string, currentPage?: string) => {
    if (!text.trim() || isLoading) return
    setError(null)
    setSuggestedFollowups([])
    setActiveToolName(null)

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

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
        body: JSON.stringify({ message: text, conversationId, currentPage }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Errore ${res.status}`)
      }

      await handleStream(res, assistantId, conversationId)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message)
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.length > 0))
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [isLoading, conversationId, handleStream])

  const sendMessageWithFiles = useCallback(async (text: string, files: File[], currentPage?: string) => {
    if ((!text.trim() && files.length === 0) || isLoading) return
    setError(null)
    setSuggestedFollowups([])
    setActiveToolName(null)

    setIsLoading(true)

    try {
      // Upload files first
      let uploadedFiles: AiAttachment[] = []
      if (files.length > 0) {
        const formData = new FormData()
        files.forEach((f) => formData.append('files', f))

        const uploadRes = await fetch('/api/ai/upload', { method: 'POST', body: formData })
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}))
          throw new Error(errData.error || 'Errore upload file')
        }
        const uploadData = await uploadRes.json()
        uploadedFiles = uploadData.files
      }

      // Add user message with attachments
      const userMsg: AiChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])

      const assistantId = `assistant-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', toolCalls: [], createdAt: new Date().toISOString() },
      ])

      abortRef.current = new AbortController()

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId,
          currentPage,
          attachments: uploadedFiles,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Errore ${res.status}`)
      }

      await handleStream(res, assistantId, conversationId)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message)
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [isLoading, conversationId, handleStream])

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
          .map((m: { id: string; role: string; content: string; toolCalls: unknown; attachments: unknown; createdAt: string }) => ({
            id: m.id,
            role: m.role === 'USER' ? 'user' : 'assistant',
            content: m.content,
            toolCalls: Array.isArray(m.toolCalls) ? m.toolCalls : [],
            attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
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
    activeToolName,
    sendMessage,
    sendMessageWithFiles,
    setConversationId,
    loadConversation,
    clearMessages,
  }
}
