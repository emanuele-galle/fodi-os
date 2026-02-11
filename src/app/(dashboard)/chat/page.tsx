'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageCircle, Video, Hash } from 'lucide-react'
import { Button } from '@/components/ui/Button'
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

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  role: string
  lastLoginAt: string | null
}

export default function ChatPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [newMessages, setNewMessages] = useState<Message[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
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

  // Fetch team members
  useEffect(() => {
    fetch('/api/team')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.items) setTeamMembers(data.items)
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

  const [creatingMeet, setCreatingMeet] = useState(false)

  async function handleQuickMeet() {
    if (!selectedId || creatingMeet) return
    setCreatingMeet(true)
    try {
      const channelName = channels.find((c) => c.id === selectedId)?.name || 'Chat'
      const res = await fetch('/api/meetings/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: `Meet - ${channelName}` }),
      })
      if (res.ok) {
        const data = await res.json()
        // Send the meet link as a message in the channel
        await fetch(`/api/chat/channels/${selectedId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `Partecipa al meeting: ${data.meetLink}` }),
        })
        window.open(data.meetLink, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setCreatingMeet(false)
    }
  }

  function handleBack() {
    setSelectedId(null)
    setNewMessages([])
  }

  const selectedChannel = channels.find((c) => c.id === selectedId)

  return (
    <div className="flex h-[calc(100vh-7.5rem)] md:h-[calc(100vh-4rem)] -mx-4 -mt-4 -mb-20 md:-mx-6 md:-mt-6 md:-mb-6 relative overflow-hidden">
      {/* Left panel - Channel list */}
      <div className={`w-full md:w-[320px] lg:w-[340px] border-r border-border/50 flex-shrink-0 bg-card/95 backdrop-blur-sm ${selectedId ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
        <ChannelList
          channels={channels}
          selectedId={selectedId}
          onSelect={handleSelectChannel}
          onNewChannel={() => setModalOpen(true)}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
        />
      </div>

      {/* Right panel - Messages */}
      <div className={`flex-1 flex flex-col min-w-0 bg-background ${!selectedId ? 'hidden md:flex' : 'flex'}`}>
        {selectedId ? (
          <>
            {/* Channel header */}
            <div className="border-b border-border/50 px-4 md:px-6 py-2.5 flex items-center gap-3 bg-card/80 backdrop-blur-sm">
              <button
                onClick={handleBack}
                className="md:hidden p-1.5 rounded-lg hover:bg-secondary/80 mr-1 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Hash className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-[15px] truncate leading-tight">
                    {selectedChannel?.name || 'Chat'}
                  </h2>
                  <span className="text-[11px] text-muted-foreground/60 font-medium">
                    {selectedChannel?.memberCount || 0} membri
                  </span>
                </div>
              </div>
              <div className="ml-auto flex-shrink-0">
                <button
                  onClick={handleQuickMeet}
                  disabled={creatingMeet}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-secondary/80 hover:bg-secondary text-foreground/80 hover:text-foreground transition-all duration-150 disabled:opacity-50"
                >
                  <Video className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{creatingMeet ? 'Avvio...' : 'Meet'}</span>
                </button>
              </div>
            </div>

            <MessageThread
              channelId={selectedId}
              currentUserId={currentUserId}
              newMessages={newMessages}
            />
            <MessageInput onSend={handleSend} disabled={sending} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
            <div className="text-center px-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold text-foreground/80 mb-1">Chat Team</h3>
              <p className="text-sm text-muted-foreground/60 max-w-xs">
                Seleziona un canale per iniziare a chattare, oppure creane uno nuovo.
              </p>
            </div>
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
