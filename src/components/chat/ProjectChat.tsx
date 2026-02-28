'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageThread } from './MessageThread'
import { MessageInput } from './MessageInput'
import { MessageCircle, CheckSquare } from 'lucide-react'
import { useSSE } from '@/hooks/useSSE'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  createdAt: string
  type: string
  editedAt?: string
  metadata?: Record<string, unknown>
  author: {
    id: string
    firstName: string
    lastName: string
    avatarUrl?: string | null
  }
}

interface ReplyTo {
  id: string
  content: string
  authorName: string
}

interface ProjectChatProps {
  projectId: string
  folderId?: string | null
}

export function ProjectChat({ projectId, folderId }: ProjectChatProps) {
  const [channelId, setChannelId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessages, setNewMessages] = useState<Message[]>([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null)
  const channelIdRef = useRef(channelId)
  channelIdRef.current = channelId

  // Get current user
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          setCurrentUserId(data.user.id)
          setCurrentUserRole(data.user.role || '')
        }
      })
  }, [])

  // Fetch or create project channel (optionally scoped to folder)
  useEffect(() => {
    setLoading(true)
    setChannelId(null)
    const url = folderId
      ? `/api/projects/${projectId}/chat?folderId=${folderId}`
      : `/api/projects/${projectId}/chat`
    fetch(url)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.id) setChannelId(data.id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectId, folderId])

  // SSE real-time for project chat
  useSSE(useCallback((event) => {
    const msgChannelId = (event as { channelId?: string }).channelId

    if (event.type === 'new_message' && event.data) {
      const msg = event.data as Message & { channelId?: string }
      const ch = msgChannelId || msg.channelId
      if (ch === channelIdRef.current) {
        setNewMessages((prev) => [...prev, msg])
      }
    }

    if (event.type === 'message_edited' && event.data) {
      const edited = event.data as Message & { editedAt?: string }
      setNewMessages((prev) =>
        prev.map((m) => m.id === edited.id ? { ...m, content: edited.content, editedAt: edited.editedAt } : m)
      )
    }

    if (event.type === 'message_deleted' && event.data) {
      const deleted = event.data as { id: string }
      setNewMessages((prev) => prev.filter((m) => m.id !== deleted.id))
    }

    if (event.type === 'message_reaction' && event.data) {
      const reacted = event.data as { id: string; metadata: Record<string, unknown> }
      setNewMessages((prev) =>
        prev.map((m) => m.id === reacted.id ? { ...m, metadata: reacted.metadata } : m)
      )
    }
  }, []))

  // Send message (with reply metadata support)
  async function handleSend(content: string) {
    if (!channelId || sending) return
    setSending(true)
    try {
      const body: Record<string, unknown> = { content }
      if (replyTo) {
        body.metadata = {
          replyToId: replyTo.id,
          replyToContent: replyTo.content.slice(0, 200),
          replyToAuthor: replyTo.authorName,
        }
      }
      await fetch(`/api/chat/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setReplyTo(null)
    } finally {
      setSending(false)
    }
  }

  // Edit message
  async function handleEditMessage(messageId: string, newContent: string) {
    if (!channelId) return
    await fetch(`/api/chat/channels/${channelId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent }),
    })
  }

  // Delete message
  async function handleDeleteMessage(messageId: string) {
    if (!channelId) return
    await fetch(`/api/chat/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
    })
  }

  // Toggle message selection for bulk delete
  function toggleMessageSelection(messageId: string) {
    setSelectedMessages(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }

  // Bulk delete selected messages
  async function handleBulkDelete() {
    if (!channelId || selectedMessages.size === 0) return
    const ids = Array.from(selectedMessages)
    await Promise.all(ids.map(id =>
      fetch(`/api/chat/channels/${channelId}/messages/${id}`, { method: 'DELETE' })
    ))
    setSelectedMessages(new Set())
    setSelectionMode(false)
  }

  // Exit selection mode
  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedMessages(new Set())
  }

  // React to message
  async function handleReact(messageId: string, emoji: string) {
    if (!channelId) return
    await fetch(`/api/chat/channels/${channelId}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
  }

  // Reply handler
  function handleReply(msg: { id: string; content: string; authorName: string }) {
    setReplyTo(msg)
  }

  // Send file in chat
  async function handleSendFile(file: File) {
    if (!channelId) return
    setSending(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await fetch(`/api/chat/channels/${channelId}/upload`, { method: 'POST', body: formData })
    } finally {
      setSending(false)
    }
  }

  // Send external link in chat
  async function handleSendLink(url: string) {
    if (!channelId || sending) return
    setSending(true)
    try {
      await fetch(`/api/chat/channels/${channelId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
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
      {/* Action bar */}
      <div className="px-3 py-1.5 border-b border-border/50 bg-card/80 flex items-center justify-between">
        <span className="text-xs text-muted-foreground/60 font-medium">Chat progetto</span>
        <button
          onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
          className={cn(
            'h-7 w-7 rounded-md flex items-center justify-center transition-all duration-150',
            selectionMode ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground/50 hover:bg-secondary/80 hover:text-foreground'
          )}
          title={selectionMode ? 'Esci dalla selezione' : 'Seleziona messaggi'}
        >
          <CheckSquare className="h-3.5 w-3.5" />
        </button>
      </div>

      <MessageThread
        channelId={channelId}
        currentUserId={currentUserId}
        newMessages={newMessages}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReply={handleReply}
        onReact={handleReact}
        userRole={currentUserRole}
        selectionMode={selectionMode}
        selectedMessages={selectedMessages}
        onToggleSelection={toggleMessageSelection}
      />

      {/* Floating selection bar */}
      {selectionMode && selectedMessages.size > 0 && (
        <div className="px-3 py-2 bg-card border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selectedMessages.size} selezionati
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={exitSelectionMode}
              className="px-2.5 py-1 text-xs rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-2.5 py-1 text-xs rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Elimina ({selectedMessages.size})
            </button>
          </div>
        </div>
      )}

      <MessageInput
        onSend={handleSend}
        onSendFile={handleSendFile}
        onSendLink={handleSendLink}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={sending}
      />
    </div>
  )
}
