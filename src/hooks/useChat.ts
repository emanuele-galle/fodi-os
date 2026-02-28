'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSSE } from '@/hooks/useSSE'
import type { ReadStatusMap } from '@/components/chat/MessageThread'

interface ChannelItem {
  id: string
  name: string
  type: string
  memberCount: number
  memberUserIds?: string[]
  lastMessage: {
    content: string
    authorName: string
    authorId?: string
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
  lastActiveAt: string | null
}

interface ReplyTo {
  id: string
  content: string
  authorName: string
}

export function useChat() {
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
  const [channelError, setChannelError] = useState<string | null>(null)
  const [creatingMeet, setCreatingMeet] = useState(false)
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

  useEffect(() => { fetchChannels() }, [fetchChannels])

  // Check URL query for channel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const channelParam = params.get('channel')
    if (channelParam) setSelectedId(channelParam)
  }, [])

  // SSE real-time
  // eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
  useSSE(useCallback((event) => {
    if (event.type === 'new_message' && event.data) {
      const msg = event.data as Message & { channelId?: string }
      const msgChannelId = (event as { channelId?: string }).channelId || msg.channelId

      setChannels((prev) => {
        const knownChannel = prev.find(ch => ch.id === msgChannelId)
        if (!knownChannel) {
          fetchChannels()
          return prev
        }
        return prev.map((ch) => {
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
      })

      if (msgChannelId === selectedIdRef.current) {
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

    if (event.type === 'typing' && event.data) {
      const { userId, userName } = event.data as { userId: string; userName: string }
      const channelId = (event as { channelId?: string }).channelId
      if (channelId === selectedIdRef.current) {
        setTypingUsers((prev) => {
          const newMap = new Map(prev)
          const existing = newMap.get(userId)
          if (existing) clearTimeout(existing.timeout)
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
  }, [fetchChannels]))

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

    fetch(`/api/chat/channels/${id}/read`, { method: 'POST' })

    setChannels((prev) => {
      const ch = prev.find((c) => c.id === id)
      if (ch?.hasUnread) window.dispatchEvent(new Event('chat:read'))
      return prev.map((c) => (c.id === id ? { ...c, hasUnread: false } : c))
    })
  }

  // Send message
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

  // Quick meet
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
      } catch { /* Continue without attendees */ }

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

  // Start or open a DM
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

  // Toggle message selection
  function toggleMessageSelection(messageId: string) {
    setSelectedMessages(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }

  // Bulk delete
  async function handleBulkDelete() {
    if (!selectedId || selectedMessages.size === 0) return
    const ids = Array.from(selectedMessages)
    await Promise.all(ids.map(id =>
      fetch(`/api/chat/channels/${selectedId}/messages/${id}`, { method: 'DELETE' })
    ))
    setSelectedMessages(new Set())
    setSelectionMode(false)
  }

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
    if (typingDebounce.current) return
    fetch(`/api/chat/channels/${selectedId}/typing`, { method: 'POST' })
    typingDebounce.current = setTimeout(() => { typingDebounce.current = null }, 2000)
  }

  // Send file
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

  function handleReply(msg: { id: string; content: string; authorName: string }) {
    setReplyTo(msg)
  }

  function clearReply() {
    setReplyTo(null)
  }

  const selectedChannel = channels.find((c) => c.id === selectedId)
  const typingNames = Array.from(typingUsers.values()).map((u) => u.name.split(' ')[0])

  // DM online status
  const dmOtherMember = selectedChannel?.type === 'DIRECT'
    ? teamMembers.find(m => selectedChannel.memberUserIds?.includes(m.id) && m.id !== currentUserId)
    : null
  const dmOtherOnline = dmOtherMember
    ? (() => {
        const ts = dmOtherMember.lastActiveAt || dmOtherMember.lastLoginAt
        if (!ts) return false
        return Date.now() - new Date(ts).getTime() < 5 * 60 * 1000
      })()
    : false
  const dmLastSeen = dmOtherMember
    ? (() => {
        const ts = dmOtherMember.lastActiveAt || dmOtherMember.lastLoginAt
        if (!ts) return null
        const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
        if (diff < 1) return 'Ultimo accesso ora'
        if (diff < 60) return `Ultimo accesso ${diff} min fa`
        if (diff < 1440) return `Ultimo accesso ${Math.floor(diff / 60)} ore fa`
        return `Ultimo accesso ${Math.floor(diff / 1440)} giorni fa`
      })()
    : null

  return {
    // State
    channels, selectedId, selectedChannel, modalOpen, sending, currentUserId, currentUserRole,
    newMessages, teamMembers, replyTo, showInfoPanel, searchOpen, searchQuery, searchResults,
    searching, selectionMode, selectedMessages, sendError, readStatus, channelError, creatingMeet,
    typingNames, dmOtherOnline, dmLastSeen,
    // Setters
    setModalOpen, setShowInfoPanel, setSearchOpen, setSelectionMode, setSendError, setSelectedId,
    setNewMessages, setChannels,
    // Handlers
    handleSelectChannel, handleSend, handleChannelCreated, handleQuickMeet, handleBack,
    handleStartDM, handleEditMessage, handleDeleteMessage, toggleMessageSelection,
    handleBulkDelete, exitSelectionMode, handleReact, handleTyping, handleSendFile,
    handleSearch, handleReply, clearReply, fetchChannels,
  }
}
