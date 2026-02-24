'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check } from 'lucide-react'
import { MessageBubble, ReadReceipt } from './MessageBubble'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  createdAt: string
  type: string
  editedAt?: string | null
  metadata?: Record<string, unknown> | null
  author: {
    id: string
    firstName: string
    lastName: string
    avatarUrl?: string | null
  }
}

export interface ReadStatusMap {
  [userId: string]: { lastReadAt: string | null; name: string }
}

interface MessageThreadProps {
  channelId: string
  currentUserId: string
  newMessages: Message[]
  readStatus?: ReadStatusMap
  onEditMessage?: (messageId: string, newContent: string) => void
  onDeleteMessage?: (messageId: string) => void
  onDeleteMessages?: (messageIds: string[]) => void
  onReply?: (message: { id: string; content: string; authorName: string }) => void
  onReact?: (messageId: string, emoji: string) => void
  userRole?: string
  selectionMode?: boolean
  selectedMessages?: Set<string>
  onToggleSelection?: (messageId: string) => void
}

export function MessageThread({ channelId, currentUserId, newMessages, readStatus, onEditMessage, onDeleteMessage, onDeleteMessages, onReply, onReact, userRole, selectionMode, selectedMessages, onToggleSelection }: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [localReadStatus, setLocalReadStatus] = useState<ReadStatusMap>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

  // Update local read status from props (SSE updates)
  useEffect(() => {
    if (readStatus) {
      setLocalReadStatus((prev) => ({ ...prev, ...readStatus }))
    }
  }, [readStatus])

  // Compute read receipts for a given message
  function getReadReceipts(msg: Message): ReadReceipt[] {
    if (msg.author.id !== currentUserId) return []
    const receipts: ReadReceipt[] = []
    const msgTime = new Date(msg.createdAt).getTime()
    for (const [userId, info] of Object.entries(localReadStatus)) {
      if (userId === currentUserId) continue // Skip self
      if (info.lastReadAt && new Date(info.lastReadAt).getTime() >= msgTime) {
        receipts.push({ userId, name: info.name, readAt: info.lastReadAt })
      }
    }
    return receipts
  }

  const fetchMessages = useCallback(async (cursorId?: string) => {
    const params = new URLSearchParams({ limit: '50' })
    if (cursorId) params.set('cursor', cursorId)

    const res = await fetch(`/api/chat/channels/${channelId}/messages?${params}`)
    if (!res.ok) return null
    return res.json()
  }, [channelId])

  // Load initial messages
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessages([])
    setCursor(null)
    shouldAutoScroll.current = true

    fetchMessages()
      .then((data) => {
        if (cancelled) return
        if (data) {
          setMessages(data.items || [])
          setCursor(data.nextCursor)
          if (data.readStatus) setLocalReadStatus(data.readStatus)
        }
      })
      .catch(() => {
        // Network error - stop loading to avoid infinite skeleton
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [channelId, fetchMessages])

  // Handle new SSE messages (new, edited, deleted, reactions)
  useEffect(() => {
    if (newMessages.length === 0) return
    setMessages((prev) => {
      let updated = [...prev]
      for (const msg of newMessages) {
        const existingIndex = updated.findIndex((m) => m.id === msg.id)
        if (existingIndex >= 0) {
          // Update existing message (edit, reaction)
          updated[existingIndex] = { ...updated[existingIndex], ...msg }
        } else {
          // New message
          updated.push(msg)
        }
      }
      return updated
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
  }, [loading, messages.length])

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
          {group.messages.map((msg, msgIdx) => {
            const prevMsg = msgIdx > 0 ? group.messages[msgIdx - 1] : null
            const sameAuthor = prevMsg && prevMsg.author.id === msg.author.id && prevMsg.type !== 'SYSTEM'
            const withinTimeWindow = prevMsg && (new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime()) < 5 * 60 * 1000
            const isGrouped = sameAuthor && withinTimeWindow
            const showAvatar = !isGrouped
            const showName = !isGrouped

            return (
              <div key={msg.id} className={cn('flex items-start', selectionMode && (msg.author.id === currentUserId || userRole === 'ADMIN') && 'pl-2')}>
                {selectionMode && (msg.author.id === currentUserId || userRole === 'ADMIN') && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleSelection?.(msg.id) }}
                    className={cn(
                      'flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors mr-1 mt-3',
                      selectedMessages?.has(msg.id)
                        ? 'bg-primary border-primary text-white'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    {selectedMessages?.has(msg.id) && <Check className="h-3 w-3" />}
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <MessageBubble
                    message={msg}
                    isOwn={msg.author.id === currentUserId}
                    currentUserId={currentUserId}
                    userRole={userRole}
                    readReceipts={getReadReceipts(msg)}
                    showAvatar={showAvatar}
                    showName={showName}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                    onReply={onReply}
                    onReact={onReact}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  )
}
