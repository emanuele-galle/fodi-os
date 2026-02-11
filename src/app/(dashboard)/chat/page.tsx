'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageCircle } from 'lucide-react'
import { ChannelList } from '@/components/chat/ChannelList'
import { MessageThread } from '@/components/chat/MessageThread'
import { MessageInput } from '@/components/chat/MessageInput'
import { NewChannelModal } from '@/components/chat/NewChannelModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSSE } from '@/hooks/useSSE'

interface ChannelItem {
  id: string
  name: string
  type: string
  memberCount: number
  lastMessage: {
    content: string
    authorName: string
    createdAt: string
  } | null
  hasUnread: boolean
}

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

export default function ChatPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [newMessages, setNewMessages] = useState<Message[]>([])
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId

  // Get current user
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) setCurrentUserId(data.user.id)
      })
  }, [])

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    const res = await fetch('/api/chat/channels')
    if (res.ok) {
      const data = await res.json()
      setChannels(data.items || [])
    }
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  // Check URL query for channel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const channelParam = params.get('channel')
    if (channelParam) setSelectedId(channelParam)
  }, [])

  // SSE real-time
  useSSE(useCallback((event) => {
    if (event.type === 'new_message' && event.data) {
      const msg = event.data as Message & { channelId?: string }
      const msgChannelId = (event as { channelId?: string }).channelId || msg.channelId

      // Update channel list (last message, unread)
      setChannels((prev) =>
        prev.map((ch) => {
          if (ch.id !== msgChannelId) return ch
          return {
            ...ch,
            lastMessage: {
              content: (msg.content || '').slice(0, 100),
              authorName: `${msg.author.firstName} ${msg.author.lastName}`,
              createdAt: msg.createdAt,
            },
            hasUnread: ch.id !== selectedIdRef.current,
          }
        }).sort((a, b) => {
          if (a.hasUnread !== b.hasUnread) return a.hasUnread ? -1 : 1
          const aTime = a.lastMessage?.createdAt || ''
          const bTime = b.lastMessage?.createdAt || ''
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        })
      )

      // Append to thread if viewing that channel
      if (msgChannelId === selectedIdRef.current) {
        setNewMessages((prev) => [...prev, msg])
      }
    }
  }, []))

  // Select channel
  function handleSelectChannel(id: string) {
    setSelectedId(id)
    setNewMessages([])

    // Mark as read
    fetch(`/api/chat/channels/${id}/read`, { method: 'POST' })

    // Remove unread indicator
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, hasUnread: false } : ch))
    )
  }

  // Send message
  async function handleSend(content: string) {
    if (!selectedId || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/chat/channels/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        console.error('Failed to send message')
      }
    } finally {
      setSending(false)
    }
  }

  // New channel created
  function handleChannelCreated(channel: { id: string; name: string }) {
    fetchChannels()
    setSelectedId(channel.id)
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-6">
      {/* Left panel - Channel list */}
      <div className="w-80 border-r border-border/10 bg-sidebar/50 flex-shrink-0">
        <ChannelList
          channels={channels}
          selectedId={selectedId}
          onSelect={handleSelectChannel}
          onNewChannel={() => setModalOpen(true)}
        />
      </div>

      {/* Right panel - Messages */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedId ? (
          <>
            {/* Channel header */}
            <div className="border-b border-border/10 px-6 py-3 flex items-center gap-3">
              <h2 className="font-semibold">
                {channels.find((c) => c.id === selectedId)?.name || 'Chat'}
              </h2>
              <span className="text-xs text-muted">
                {channels.find((c) => c.id === selectedId)?.memberCount || 0} membri
              </span>
            </div>

            <MessageThread
              channelId={selectedId}
              currentUserId={currentUserId}
              newMessages={newMessages}
            />
            <MessageInput onSend={handleSend} disabled={sending} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={MessageCircle}
              title="Chat Team"
              description="Seleziona un canale per iniziare a chattare, oppure creane uno nuovo."
            />
          </div>
        )}
      </div>

      <NewChannelModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleChannelCreated}
      />
    </div>
  )
}
