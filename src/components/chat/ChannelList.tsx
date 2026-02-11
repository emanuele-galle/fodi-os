'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Search, Plus, Hash, Lock, Users, FolderKanban, ChevronDown, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { ChatUnreadBadge } from './ChatUnreadBadge'

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

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  role: string
  lastLoginAt: string | null
}

interface ChannelListProps {
  channels: ChannelItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNewChannel: () => void
  teamMembers?: TeamMember[]
  currentUserId?: string
}

const TYPE_ICON: Record<string, React.ElementType> = {
  PUBLIC: Hash,
  PRIVATE: Lock,
  DIRECT: Users,
  PROJECT: FolderKanban,
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES: 'Sales',
  PM: 'PM',
  DEVELOPER: 'Dev',
  CONTENT: 'Content',
  SUPPORT: 'Support',
  CLIENT: 'Client',
}

function isRecentlyActive(lastLoginAt: string | null): boolean {
  if (!lastLoginAt) return false
  const diff = Date.now() - new Date(lastLoginAt).getTime()
  return diff < 30 * 60 * 1000 // 30 minutes
}

export function ChannelList({ channels, selectedId, onSelect, onNewChannel, teamMembers = [], currentUserId }: ChannelListProps) {
  const [search, setSearch] = useState('')
  const [teamExpanded, setTeamExpanded] = useState(true)

  const filtered = channels.filter((ch) =>
    ch.name.toLowerCase().includes(search.toLowerCase())
  )

  const onlineMembers = teamMembers.filter((m) => isRecentlyActive(m.lastLoginAt) && m.id !== currentUserId)
  const offlineMembers = teamMembers.filter((m) => !isRecentlyActive(m.lastLoginAt) && m.id !== currentUserId)
  const onlineCount = onlineMembers.length

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Chat</h2>
          <Button size="icon" variant="ghost" onClick={onNewChannel} title="Nuovo Canale">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca canale..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Team members section */}
      {teamMembers.length > 0 && (
        <div className="border-b border-border/50">
          <button
            onClick={() => setTeamExpanded(!teamExpanded)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-secondary/50 transition-colors"
          >
            {teamExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted" /> : <ChevronRight className="h-3.5 w-3.5 text-muted" />}
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Team</span>
            {onlineCount > 0 && (
              <span className="text-[10px] text-green-600 font-medium ml-auto">{onlineCount} online</span>
            )}
          </button>
          {teamExpanded && (
            <div className="px-3 pb-2.5 space-y-0.5 max-h-44 overflow-y-auto">
              {onlineMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-secondary/50 transition-colors">
                  <div className="relative flex-shrink-0">
                    <Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatarUrl} size="sm" className="!h-7 !w-7 !text-[10px]" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
                  </div>
                  <span className="text-sm text-foreground truncate">{member.firstName} {member.lastName}</span>
                  <span className="text-[10px] text-muted ml-auto flex-shrink-0">{ROLE_LABELS[member.role] || member.role}</span>
                </div>
              ))}
              {offlineMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-secondary/50 transition-colors opacity-60">
                  <div className="relative flex-shrink-0">
                    <Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatarUrl} size="sm" className="!h-7 !w-7 !text-[10px]" />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-gray-400" />
                  </div>
                  <span className="text-sm text-foreground truncate">{member.firstName} {member.lastName}</span>
                  <span className="text-[10px] text-muted ml-auto flex-shrink-0">{ROLE_LABELS[member.role] || member.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Channels header */}
      <div className="px-4 pt-3 pb-1">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">Canali</span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">Nessun canale trovato</p>
        ) : (
          filtered.map((channel) => {
            const Icon = TYPE_ICON[channel.type] || Hash
            const isSelected = channel.id === selectedId

            return (
              <button
                key={channel.id}
                onClick={() => onSelect(channel.id)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors relative',
                  isSelected
                    ? 'bg-primary/10 border-l-3 border-primary'
                    : 'hover:bg-secondary border-l-3 border-transparent'
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-sm font-medium truncate',
                      isSelected ? 'text-primary' : 'text-foreground',
                      channel.hasUnread && !isSelected && 'font-bold'
                    )}>
                      {channel.name}
                    </span>
                    {channel.lastMessage && (
                      <span className="text-xs text-muted flex-shrink-0 ml-2">
                        {formatTime(channel.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  {channel.lastMessage && (
                    <p className="text-xs text-muted truncate mt-0.5">
                      <span className="font-medium">{channel.lastMessage.authorName.split(' ')[0]}:</span>{' '}
                      {channel.lastMessage.content}
                    </p>
                  )}
                </div>
                {channel.hasUnread && !isSelected && (
                  <ChatUnreadBadge />
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 604800000) {
    return date.toLocaleDateString('it-IT', { weekday: 'short' })
  }
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}
