'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- event handlers */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Send, Paperclip, FileText, Download, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSSE } from '@/hooks/useSSE'

interface ChatAuthor {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  role: string
}

interface ChatMessage {
  id: string
  content: string
  type: 'TEXT' | 'SYSTEM' | 'FILE_LINK' | 'EXTERNAL_LINK'
  metadata: Record<string, unknown> | null
  createdAt: string
  author: ChatAuthor
}

export default function PortalChatPage() {
  const [channelId, setChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [typingName, setTypingName] = useState<string | null>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const lastTypingSentRef = useRef(0)

  // Get current user
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user?.id) setCurrentUserId(data.user.id)
      })
      .catch(() => {})
  }, [])

  // Init channel
  useEffect(() => {
    fetch('/api/portal/chat')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.channelId) {
          setChannelId(data.channelId)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch messages
  const fetchMessages = useCallback(() => {
    if (!channelId) return
    fetch('/api/portal/chat/messages?limit=100')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        setMessages(data.items || [])
      })
      .finally(() => setLoading(false))
  }, [channelId])

  useEffect(() => {
    if (channelId) {
      fetchMessages()
      // Mark as read
      fetch(`/api/chat/channels/${channelId}/read`, { method: 'POST' }).catch(() => {})
    }
  }, [channelId, fetchMessages])

  // SSE listeners
  useSSE(
    useCallback(
      (event) => {
        if (!channelId) return

        if (event.type === 'new_message' && event.channelId === channelId) {
          const msg = event.data as ChatMessage
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          // Auto mark as read
          fetch(`/api/chat/channels/${channelId}/read`, { method: 'POST' }).catch(() => {})
        }

        if (event.type === 'typing' && event.channelId === channelId) {
          const data = event.data as { userName: string }
          setTypingName(data.userName)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setTypingName(null), 3000)
        }
      },
      [channelId]
    )
  )

  // Auto-scroll
  useEffect(() => {
    if (!showScrollBtn) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, showScrollBtn])

  function handleScroll() {
    const el = scrollContainerRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setShowScrollBtn(!isNearBottom)
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBtn(false)
  }

  // Send typing indicator (throttled)
  function sendTyping() {
    if (!channelId) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now
    fetch('/api/portal/chat/typing', { method: 'POST' }).catch(() => {})
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || sending || !channelId) return
    setSending(true)

    try {
      const res = await fetch('/api/portal/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })
      if (res.ok) {
        setNewMessage('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      }
    } catch {
      // silently fail
    } finally {
      setSending(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !channelId) return
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      await fetch('/api/portal/chat/upload', {
        method: 'POST',
        body: formData,
      })
    } catch {
      // silently fail
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    setNewMessage(el.value)
    sendTyping()
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Oggi'
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Ieri'
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
  }

  // Group messages by date
  function getDateSeparators() {
    const separators = new Map<number, string>()
    let lastDate = ''
    messages.forEach((msg, i) => {
      const date = new Date(msg.createdAt).toDateString()
      if (date !== lastDate) {
        separators.set(i, formatDate(msg.createdAt))
        lastDate = date
      }
    })
    return separators
  }

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex-1 space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-3/4 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const dateSeparators = getDateSeparators()

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">Chat Assistenza</h1>
        <p className="text-xs text-muted-foreground">
          {typingName ? `${typingName} sta scrivendo...` : 'Scrivi per contattare il nostro team'}
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1 relative"
      >
        {messages.map((msg, i) => {
          const isOwn = msg.author.id === currentUserId
          const isSystem = msg.type === 'SYSTEM'
          const authorName = `${msg.author.firstName} ${msg.author.lastName}`
          const dateSep = dateSeparators.get(i)

          return (
            <div key={msg.id}>
              {dateSep && (
                <div className="flex items-center justify-center my-3">
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {dateSep}
                  </span>
                </div>
              )}

              {isSystem ? (
                <div className="flex justify-center my-2">
                  <span className="text-xs text-muted-foreground italic">{msg.content}</span>
                </div>
              ) : (
                <div className={`flex gap-2 mb-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  {!isOwn && (
                    <Avatar name={authorName} size="sm" className="shrink-0 mt-1" />
                  )}
                  <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-[10px] font-medium mb-0.5 opacity-70">{authorName}</p>
                      )}

                      {msg.type === 'FILE_LINK' && msg.metadata ? (
                        <a
                          href={msg.metadata.fileUrl as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 text-xs rounded px-2 py-1.5 ${
                            isOwn
                              ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                              : 'bg-background hover:bg-secondary'
                          } transition-colors`}
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">{msg.metadata.fileName as string}</span>
                          <Download className="h-3 w-3 shrink-0 ml-auto" />
                        </a>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                    </div>
                    <p className={`text-xs text-muted-foreground mt-0.5 ${isOwn ? 'text-right' : ''}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={scrollToBottom}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-background border border-border shadow-md text-xs font-medium hover:bg-secondary transition-colors"
          >
            <ArrowDown className="h-3 w-3" />
            Nuovi messaggi
          </button>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-border p-3">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={autoResize}
            placeholder="Scrivi un messaggio..."
            rows={1}
            className="flex-1 rounded-[10px] border border-border/40 bg-card shadow-[var(--shadow-sm)] px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none overflow-hidden"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend(e)
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !newMessage.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        {uploading && (
          <p className="text-xs text-muted-foreground mt-1">Caricamento file in corso...</p>
        )}
      </div>
    </div>
  )
}
