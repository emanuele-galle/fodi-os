'use client'

import { useState, useEffect } from 'react'
import { X, Hash, Lock, Users, FolderKanban, UserPlus, LogOut, Settings, Pencil, Archive, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

interface ChannelMember {
  id: string
  userId: string
  role: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl: string | null
    role: string
  }
}

interface ChannelInfo {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  isArchived: boolean
  createdAt: string
  members: ChannelMember[]
}

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  role: string
}

interface ChannelInfoPanelProps {
  channelId: string
  currentUserId: string
  teamMembers: TeamMember[]
  onClose: () => void
  onDeleteChannel?: (id: string) => void
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  PUBLIC: Hash,
  PRIVATE: Lock,
  DIRECT: Users,
  PROJECT: FolderKanban,
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietario',
  ADMIN: 'Admin',
  MEMBER: 'Membro',
}

export function ChannelInfoPanel({ channelId, currentUserId, teamMembers, onClose, onDeleteChannel }: ChannelInfoPanelProps) {
  const [channel, setChannel] = useState<ChannelInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [descValue, setDescValue] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchChannel()
  }, [channelId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchChannel() {
    setLoading(true)
    const res = await fetch(`/api/chat/channels/${channelId}`)
    if (res.ok) {
      const data = await res.json()
      setChannel(data)
      setNameValue(data.name)
      setDescValue(data.description || '')
    }
    setLoading(false)
  }

  async function handleUpdateChannel(updates: Record<string, unknown>) {
    const res = await fetch(`/api/chat/channels/${channelId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      fetchChannel()
    }
  }

  async function handleAddMember(userId: string) {
    const res = await fetch(`/api/chat/channels/${channelId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [userId] }),
    })
    if (res.ok) {
      fetchChannel()
      setShowAddMember(false)
    }
  }

  if (loading || !channel) {
    return (
      <div className="w-[320px] border-l border-border/50 bg-card/95 flex-shrink-0 flex items-center justify-center">
        <div className="text-sm text-muted-foreground/50 animate-pulse">Caricamento...</div>
      </div>
    )
  }

  const TypeIcon = TYPE_ICONS[channel.type] || Hash
  const currentMember = channel.members.find((m) => m.userId === currentUserId)
  const isOwnerOrAdmin = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN'
  const existingMemberIds = new Set(channel.members.map((m) => m.userId))
  const availableMembers = teamMembers.filter((m) => !existingMemberIds.has(m.id))

  return (
    <div className="w-[320px] border-l border-border/50 bg-card/95 flex-shrink-0 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <h3 className="font-semibold text-sm">Info Canale</h3>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-md hover:bg-secondary/80 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Channel info */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <TypeIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              {editingName && isOwnerOrAdmin ? (
                <div className="flex items-center gap-1">
                  <input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateChannel({ name: nameValue.trim() })
                        setEditingName(false)
                      }
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                    className="text-lg font-semibold bg-transparent border-b border-primary/30 outline-none w-full"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold truncate">{channel.name}</h2>
                  {isOwnerOrAdmin && (
                    <button onClick={() => setEditingName(true)} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              <span className="text-xs text-muted-foreground/60">
                {channel.type === 'DIRECT' ? 'Messaggio diretto' : `Canale ${channel.type.toLowerCase()}`}
              </span>
            </div>
          </div>

          {/* Description */}
          {channel.type !== 'DIRECT' && (
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Descrizione</label>
              {editingDesc && isOwnerOrAdmin ? (
                <div className="mt-1">
                  <textarea
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleUpdateChannel({ description: descValue.trim() || null })
                        setEditingDesc(false)
                      }
                      if (e.key === 'Escape') setEditingDesc(false)
                    }}
                    className="w-full text-sm bg-secondary/40 rounded-lg px-3 py-2 outline-none border border-border/30 focus:ring-1 focus:ring-primary/20 resize-none"
                    rows={3}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-start gap-2 mt-1">
                  <p className="text-sm text-muted-foreground/70 flex-1">
                    {channel.description || 'Nessuna descrizione'}
                  </p>
                  {isOwnerOrAdmin && (
                    <button onClick={() => setEditingDesc(true)} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors mt-0.5">
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Created */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Creato il</label>
            <p className="text-sm text-muted-foreground/60 mt-1">
              {new Date(channel.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Members */}
        <div className="border-t border-border/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Membri ({channel.members.length})
            </span>
            {isOwnerOrAdmin && channel.type !== 'DIRECT' && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="h-6 w-6 rounded-md bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
              >
                <UserPlus className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Add member dropdown */}
          {showAddMember && availableMembers.length > 0 && (
            <div className="mb-3 border border-border/30 rounded-lg bg-secondary/30 max-h-40 overflow-y-auto">
              {availableMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleAddMember(member.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/60 transition-colors text-left"
                >
                  <Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatarUrl} size="sm" className="!h-6 !w-6 !text-[9px]" />
                  <span className="text-sm">{member.firstName} {member.lastName}</span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1">
            {channel.members.map((member) => (
              <div key={member.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors">
                <Avatar
                  name={`${member.user.firstName} ${member.user.lastName}`}
                  src={member.user.avatarUrl}
                  size="sm"
                  className="!h-7 !w-7 !text-[10px]"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {member.user.firstName} {member.user.lastName}
                    {member.userId === currentUserId && <span className="text-muted-foreground/40 ml-1">(tu)</span>}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/50 font-medium">
                  {ROLE_LABELS[member.role] || member.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {isOwnerOrAdmin && channel.type !== 'DIRECT' && (
          <div className="border-t border-border/30 p-4 space-y-1">
            <button
              onClick={() => handleUpdateChannel({ isArchived: !channel.isArchived })}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/60 transition-colors text-sm text-muted-foreground"
            >
              <Archive className="h-4 w-4" />
              {channel.isArchived ? 'Riattiva canale' : 'Archivia canale'}
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-destructive/10 transition-colors text-sm text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Elimina canale
              </button>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive font-medium mb-2">
                  Tutti i messaggi verranno eliminati. Continuare?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setDeleting(true)
                      try {
                        const res = await fetch(`/api/chat/channels/${channelId}`, { method: 'DELETE' })
                        if (res.ok) {
                          onDeleteChannel?.(channelId)
                        }
                      } finally {
                        setDeleting(false)
                      }
                    }}
                    disabled={deleting}
                    className="flex-1 text-xs font-medium px-3 py-1.5 rounded-md bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Eliminazione...' : 'Conferma'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 text-xs font-medium px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
