'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageCircle, Video, Hash, Users, Search, Info, X, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ChannelList } from '@/components/chat/ChannelList'
import { MessageThread, ReadStatusMap } from '@/components/chat/MessageThread'
import { MessageInput } from '@/components/chat/MessageInput'
import { NewChannelModal } from '@/components/chat/NewChannelModal'
import { ChannelInfoPanel } from '@/components/chat/ChannelInfoPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { useSSE } from '@/hooks/useSSE'
import { cn } from '@/lib/utils'

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
  editedAt?: string | null
  metadata?: Record<string, unknown> | null
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

interface ReplyTo {
  id: string
  content: string
  authorName: string
}

export default function ChatPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [newMessages, setNewMessages] = useState<Message[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null)
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timeout: ReturnType<typeof setTimeout> }>>(new Map())
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [searching, setSearching] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const [sendError, setSendError] = useState<string | null>(null)
  const [readStatus, setReadStatus] = useState<ReadStatusMap>({})
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId

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

  // Fetch team members
  useEffect(() => {
    fetch('/api/team')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.items) setTeamMembers(data.items)
      })
  }, [])

  const [channelError, setChannelError] = useState<string | null>(null)

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    setChannelError(null)
    try {
      const res = await fetch('/api/chat/channels')
      if (res.ok) {
        const data = await res.json()
        setChannels(data.items || [])
      } else {
        setChannelError('Errore nel caricamento dei canali')
      }
    } catch {
      setChannelError('Errore di rete nel caricamento dei canali')
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

    // Handle message edited
    if (event.type === 'message_edited' && event.data) {
      const edited = event.data as Message & { editedAt?: string }
      setNewMessages((prev) =>
        prev.map((m) => m.id === edited.id ? { ...m, content: edited.content, editedAt: edited.editedAt } : m)
      )
    }

    // Handle message deleted
    if (event.type === 'message_deleted' && event.data) {
      const deleted = event.data as { id: string }
      setNewMessages((prev) => prev.filter((m) => m.id !== deleted.id))
    }

    // Handle reactions
    if (event.type === 'message_reaction' && event.data) {
      const reacted = event.data as { id: string; metadata: Record<string, unknown> }
      setNewMessages((prev) =>
        prev.map((m) => m.id === reacted.id ? { ...m, metadata: reacted.metadata } : m)
      )
    }

    // Handle read receipts
    if (event.type === 'message_read' && event.data) {
      const { userId, lastReadAt } = event.data as { userId: string; lastReadAt: string }
      const channelId = (event as { channelId?: string }).channelId
      if (channelId === selectedIdRef.current) {
        setReadStatus((prev) => ({
          ...prev,
          [userId]: { ...prev[userId], lastReadAt },
        }))
      }
    }

    // Handle typing indicator
    if (event.type === 'typing' && event.data) {
      const { userId, userName } = event.data as { userId: string; userName: string }
      const channelId = (event as { channelId?: string }).channelId
      if (channelId === selectedIdRef.current) {
        setTypingUsers((prev) => {
          const newMap = new Map(prev)
          // Clear existing timeout for this user
          const existing = newMap.get(userId)
          if (existing) clearTimeout(existing.timeout)
          // Set new timeout to clear typing after 3s
          const timeout = setTimeout(() => {
            setTypingUsers((p) => {
              const updated = new Map(p)
              updated.delete(userId)
              return updated
            })
          }, 3000)
          newMap.set(userId, { name: userName, timeout })
          return newMap
        })
      }
    }
  }, []))

  // Select channel
  function handleSelectChannel(id: string) {
    setSelectedId(id)
    setNewMessages([])
    setReplyTo(null)
    setTypingUsers(new Map())
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setSelectionMode(false)
    setSelectedMessages(new Set())
    setReadStatus({})

    // Mark as read
    fetch(`/api/chat/channels/${id}/read`, { method: 'POST' })

    // Remove unread indicator + notify layout to update sidebar badge
    setChannels((prev) => {
      const ch = prev.find((c) => c.id === id)
      if (ch?.hasUnread) window.dispatchEvent(new Event('chat:read'))
      return prev.map((c) => (c.id === id ? { ...c, hasUnread: false } : c))
    })
  }

  // Send message (with reply metadata support)
  async function handleSend(content: string) {
    if (!selectedId || sending) return
    setSending(true)
    setSendError(null)
    try {
      const body: Record<string, unknown> = { content }
      if (replyTo) {
        body.metadata = {
          replyToId: replyTo.id,
          replyToContent: replyTo.content.slice(0, 200),
          replyToAuthor: replyTo.authorName,
        }
      }
      const res = await fetch(`/api/chat/channels/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setSendError('Invio messaggio fallito')
      }
    } catch {
      setSendError('Errore di rete nell\'invio del messaggio')
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

      let attendeeEmails: string[] = []
      try {
        const membersRes = await fetch(`/api/chat/channels/${selectedId}`)
        if (membersRes.ok) {
          const channelData = await membersRes.json()
          const memberEmails = channelData.members
            ?.map((m: { user?: { email?: string } }) => m.user?.email)
            .filter(Boolean) || []
          attendeeEmails = memberEmails
        }
      } catch {
        // Continue without attendees
      }

      const res = await fetch('/api/meetings/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `Meet - ${channelName}`,
          attendeeEmails,
          channelId: selectedId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
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
    setShowInfoPanel(false)
  }

  // Start or open a DM with a team member
  async function handleStartDM(memberId: string) {
    try {
      const res = await fetch('/api/chat/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: memberId }),
      })
      if (res.ok) {
        const channel = await res.json()
        await fetchChannels()
        handleSelectChannel(channel.id)
      } else {
        setSendError('Impossibile avviare la conversazione')
      }
    } catch {
      setSendError('Errore di rete nell\'avvio della conversazione')
    }
  }

  // Edit message
  async function handleEditMessage(messageId: string, newContent: string) {
    if (!selectedId) return
    await fetch(`/api/chat/channels/${selectedId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent }),
    })
  }

  // Delete message
  async function handleDeleteMessage(messageId: string) {
    if (!selectedId) return
    await fetch(`/api/chat/channels/${selectedId}/messages/${messageId}`, {
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
    if (!selectedId || selectedMessages.size === 0) return
    const ids = Array.from(selectedMessages)
    await Promise.all(ids.map(id =>
      fetch(`/api/chat/channels/${selectedId}/messages/${id}`, { method: 'DELETE' })
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
    if (!selectedId) return
    await fetch(`/api/chat/channels/${selectedId}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    })
  }

  // Typing indicator
  const typingDebounce = useRef<ReturnType<typeof setTimeout>>(null)
  function handleTyping() {
    if (!selectedId) return
    if (typingDebounce.current) return // Already sent recently
    fetch(`/api/chat/channels/${selectedId}/typing`, { method: 'POST' })
    typingDebounce.current = setTimeout(() => { typingDebounce.current = null }, 2000)
  }

  // Send file in chat
  async function handleSendFile(file: File) {
    if (!selectedId) return
    setSending(true)
    setSendError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/chat/channels/${selectedId}/upload`, { method: 'POST', body: formData })
      if (!res.ok) {
        setSendError('Caricamento file fallito')
      }
    } catch {
      setSendError('Errore di rete nel caricamento del file')
    } finally {
      setSending(false)
    }
  }

  // Search messages
  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (!selectedId || query.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/chat/channels/${selectedId}/messages/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.items || [])
      }
    } finally {
      setSearching(false)
    }
  }

  // Reply handler
  function handleReply(msg: { id: string; content: string; authorName: string }) {
    setReplyTo(msg)
  }

  const selectedChannel = channels.find((c) => c.id === selectedId)
  const typingNames = Array.from(typingUsers.values()).map((u) => u.name.split(' ')[0])

  return (
    <div className="flex h-[calc(100vh-7.5rem)] md:h-[calc(100vh-4rem)] h-[calc(100dvh-7.5rem)] md:h-[calc(100dvh-4rem)] -mx-4 -mt-4 -mb-20 md:-mx-6 md:-mt-6 md:-mb-6 relative overflow-hidden">
      {/* Left panel - Channel list */}
      <div className={`w-full md:w-[320px] lg:w-[340px] border-r border-border/50 flex-shrink-0 bg-card/95 backdrop-blur-sm ${selectedId ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
        {channelError && (
          <div className="mx-3 mt-3 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-xs text-destructive">{channelError}</p>
            <button onClick={() => fetchChannels()} className="text-xs font-medium text-destructive hover:underline flex-shrink-0 ml-2">Riprova</button>
          </div>
        )}
        <ChannelList
          channels={channels}
          selectedId={selectedId}
          onSelect={handleSelectChannel}
          onNewChannel={() => setModalOpen(true)}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          onStartDM={handleStartDM}
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
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {selectedChannel?.type === 'DIRECT' ? (
                    <Users className="h-4 w-4 text-primary" />
                  ) : (
                    <Hash className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-[15px] truncate leading-tight">
                    {selectedChannel?.name || 'Chat'}
                  </h2>
                  <span className="text-[11px] text-muted-foreground/60 font-medium">
                    {typingNames.length > 0
                      ? (
                        <span className="text-primary/70 animate-pulse">
                          {typingNames.length === 1
                            ? `${typingNames[0]} sta scrivendo...`
                            : `${typingNames.join(', ')} stanno scrivendo...`}
                        </span>
                      )
                      : selectedChannel?.type === 'DIRECT'
                        ? 'Messaggio diretto'
                        : `${selectedChannel?.memberCount || 0} membri`
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
                {/* Selection mode toggle */}
                <button
                  onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
                  className={cn(
                    'h-10 w-10 md:h-8 md:w-8 rounded-lg flex items-center justify-center transition-all duration-150 touch-manipulation',
                    selectionMode ? 'bg-destructive/10 text-destructive' : 'text-foreground/60 hover:bg-secondary/80 hover:text-foreground'
                  )}
                  title={selectionMode ? 'Esci dalla selezione' : 'Seleziona messaggi'}
                >
                  <CheckSquare className="h-4 w-4 md:h-3.5 md:w-3.5" />
                </button>
                {/* Search button */}
                <button
                  onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) { setSearchQuery(''); setSearchResults([]) } }}
                  className={cn(
                    'h-10 w-10 md:h-8 md:w-8 rounded-lg flex items-center justify-center transition-all duration-150 touch-manipulation',
                    searchOpen ? 'bg-primary/10 text-primary' : 'text-foreground/60 hover:bg-secondary/80 hover:text-foreground'
                  )}
                  title="Cerca messaggi"
                >
                  <Search className="h-4 w-4 md:h-3.5 md:w-3.5" />
                </button>
                {/* Info button */}
                <button
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={cn(
                    'h-10 w-10 md:h-8 md:w-8 rounded-lg flex items-center justify-center transition-all duration-150 touch-manipulation',
                    showInfoPanel ? 'bg-primary/10 text-primary' : 'text-foreground/60 hover:bg-secondary/80 hover:text-foreground'
                  )}
                  title="Info canale"
                >
                  <Info className="h-4 w-4 md:h-3.5 md:w-3.5" />
                </button>
                {/* Meet button */}
                <button
                  onClick={handleQuickMeet}
                  disabled={creatingMeet}
                  className="inline-flex items-center gap-1.5 h-10 md:h-8 px-3 rounded-lg text-xs font-medium bg-secondary/80 hover:bg-secondary text-foreground/80 hover:text-foreground transition-all duration-150 disabled:opacity-50 touch-manipulation"
                >
                  <Video className="h-4 w-4 md:h-3.5 md:w-3.5" />
                  <span className="hidden sm:inline">{creatingMeet ? 'Avvio...' : 'Meet'}</span>
                </button>
              </div>
            </div>

            {/* Search bar */}
            {searchOpen && (
              <div className="border-b border-border/30 px-4 md:px-6 py-2 bg-secondary/20">
                <div className="flex items-center gap-2 max-w-2xl">
                  <Search className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Cerca nei messaggi..."
                    className="flex-1 bg-transparent text-base md:text-sm outline-none placeholder:text-muted-foreground/40"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                      className="text-muted-foreground/40 hover:text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
                    {searchResults.map((msg) => (
                      <div key={msg.id} className="px-3 py-2 rounded-lg bg-card/60 hover:bg-card transition-colors text-sm">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="font-semibold text-[12px]">
                            {msg.author.firstName} {msg.author.lastName}
                          </span>
                          <span className="text-[10px] text-muted-foreground/40">
                            {new Date(msg.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-muted-foreground/80 text-[13px] line-clamp-2">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                {searching && (
                  <p className="mt-2 text-xs text-muted-foreground/50 animate-pulse">Ricerca in corso...</p>
                )}
                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground/50">Nessun risultato trovato</p>
                )}
              </div>
            )}

            <MessageThread
              channelId={selectedId}
              currentUserId={currentUserId}
              newMessages={newMessages}
              readStatus={readStatus}
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
              <div className="px-4 py-2.5 md:py-2 bg-card border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedMessages.size} messaggi selezionati
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={exitSelectionMode}
                    className="px-4 py-2 md:px-3 md:py-1.5 text-sm rounded-lg bg-secondary hover:bg-secondary/80 transition-colors min-h-[44px] md:min-h-0 touch-manipulation"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 md:px-3 md:py-1.5 text-sm rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors min-h-[44px] md:min-h-0 touch-manipulation"
                  >
                    Elimina ({selectedMessages.size})
                  </button>
                </div>
              </div>
            )}
            {sendError && (
              <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 flex items-center justify-between">
                <p className="text-xs text-destructive">{sendError}</p>
                <button onClick={() => setSendError(null)} className="text-xs text-destructive hover:underline ml-2 flex-shrink-0">Chiudi</button>
              </div>
            )}
            <MessageInput
              onSend={handleSend}
              onSendFile={handleSendFile}
              onTyping={handleTyping}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              disabled={sending}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
            <div className="text-center px-6">
              <div className="h-16 w-16 rounded-xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
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

      {/* Info panel - overlay on mobile, sidebar on desktop */}
      {showInfoPanel && selectedId && (
        <>
          <div className="md:hidden fixed inset-0 z-40 bg-foreground/50" onClick={() => setShowInfoPanel(false)} />
          <div className="fixed md:relative inset-y-0 right-0 z-50 md:z-auto">
            <ChannelInfoPanel
              channelId={selectedId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              teamMembers={teamMembers}
              onClose={() => setShowInfoPanel(false)}
              onDeleteChannel={(id) => {
                setSelectedId(null)
                setShowInfoPanel(false)
                setNewMessages([])
                setChannels((prev) => prev.filter((ch) => ch.id !== id))
              }}
            />
          </div>
        </>
      )}

      <NewChannelModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleChannelCreated}
        teamMembers={teamMembers}
        currentUserId={currentUserId}
      />
    </div>
  )
}
