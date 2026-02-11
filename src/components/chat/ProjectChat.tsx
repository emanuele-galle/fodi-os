'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageThread } from './MessageThread'
import { MessageInput } from './MessageInput'
import { MessageCircle } from 'lucide-react'
import { useSSE } from '@/hooks/useSSE'

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

interface ProjectChatProps {
  projectId: string
}

export function ProjectChat({ projectId }: ProjectChatProps) {
  const [channelId, setChannelId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessages, setNewMessages] = useState<Message[]>([])
  const channelIdRef = useRef(channelId)
  channelIdRef.current = channelId

  // Get current user
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) setCurrentUserId(data.user.id)
      })
  }, [])

  // Fetch or create project channel
  useEffect(() => {
    setLoading(true)
    fetch(`/api/projects/${projectId}/chat`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.id) setChannelId(data.id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectId])

  // SSE real-time for project chat
  useSSE(useCallback((event) => {
    if (event.type === 'new_message' && event.data) {
      const msg = event.data as Message & { channelId?: string }
      const msgChannelId = (event as { channelId?: string }).channelId || msg.channelId
      if (msgChannelId === channelIdRef.current) {
        setNewMessages((prev) => [...prev, msg])
      }
    }
  }, []))

  // Send message
  async function handleSend(content: string) {
    if (!channelId || sending) return
    setSending(true)
    try {
      await fetch(`/api/chat/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-sm text-muted-foreground">Caricamento chat...</div>
      </div>
    )
  }

  if (!channelId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Chat non disponibile per questo progetto.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[500px] border border-border/50 rounded-lg overflow-hidden bg-background">
      <MessageThread
        channelId={channelId}
        currentUserId={currentUserId}
        newMessages={newMessages}
      />
      <MessageInput onSend={handleSend} disabled={sending} />
    </div>
  )
}
