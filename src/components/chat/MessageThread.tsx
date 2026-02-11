'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageBubble } from './MessageBubble'
import { Skeleton } from '@/components/ui/Skeleton'

interface Message {
  id: string
  content: string
  createdAt: string
  type: string
  author: {
    id: string
    firstName: string
    lastName: string
    avatarUrl?: string | null
  }
}

interface MessageThreadProps {
  channelId: string
  currentUserId: string
  newMessages: Message[]
}

export function MessageThread({ channelId, currentUserId, newMessages }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

  const fetchMessages = useCallback(async (cursorId?: string) => {
    const params = new URLSearchParams({ limit: '50' })
    if (cursorId) params.set('cursor', cursorId)

    const res = await fetch(`/api/chat/channels/${channelId}/messages?${params}`)
    if (!res.ok) return null
    return res.json()
  }, [channelId])

  // Load initial messages
  useEffect(() => {
    setLoading(true)
    setMessages([])
    setCursor(null)
    shouldAutoScroll.current = true

    fetchMessages().then((data) => {
      if (data) {
        setMessages(data.items || [])
        setCursor(data.nextCursor)
      }
      setLoading(false)
    })
  }, [channelId, fetchMessages])

  // Handle new SSE messages
  useEffect(() => {
    if (newMessages.length === 0) return
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id))
      const toAdd = newMessages.filter((m) => !existingIds.has(m.id))
      if (toAdd.length === 0) return prev
      return [...prev, ...toAdd]
    })
    shouldAutoScroll.current = true
  }, [newMessages])

  // Auto-scroll on new messages
  useEffect(() => {
    if (shouldAutoScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView()
    }
  }, [loading, messages.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll: load older messages
  function handleScroll() {
    const container = containerRef.current
    if (!container || loadingMore || !cursor) return

    // Check if scrolled near top
    if (container.scrollTop < 100) {
      setLoadingMore(true)
      shouldAutoScroll.current = false
      const prevHeight = container.scrollHeight

      fetchMessages(cursor).then((data) => {
        if (data) {
          setMessages((prev) => [...(data.items || []), ...prev])
          setCursor(data.nextCursor)

          // Maintain scroll position
          requestAnimationFrame(() => {
            if (container) {
              container.scrollTop = container.scrollHeight - prevHeight
            }
          })
        }
        setLoadingMore(false)
      })
    }

    // Track if user is near bottom for auto-scroll
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    shouldAutoScroll.current = isNearBottom
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = []
  let currentDate = ''

  for (const msg of messages) {
    const date = new Date(msg.createdAt).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    if (date !== currentDate) {
      currentDate = date
      groupedMessages.push({ date, messages: [msg] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      {loadingMore && (
        <div className="flex justify-center py-3">
          <div className="animate-pulse text-sm text-muted">Caricamento...</div>
        </div>
      )}

      {groupedMessages.map((group) => (
        <div key={group.date}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 border-t border-border/10" />
            <span className="text-xs text-muted font-medium">{group.date}</span>
            <div className="flex-1 border-t border-border/10" />
          </div>
          {group.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.author.id === currentUserId}
            />
          ))}
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  )
}
