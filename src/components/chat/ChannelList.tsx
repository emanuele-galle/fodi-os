'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Search, Plus, Hash, Lock, Users, FolderKanban, ChevronDown, ChevronRight, MessageCircle } from 'lucide-react'
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
  onStartDM?: (memberId: string) => void
}

const TYPE_ICON: Record<string, React.ElementType> = {
  PUBLIC: Hash,
  PRIVATE: Lock,
  DIRECT: Users,
  PROJECT: FolderKanban,
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  MANAGER: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  SALES: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  PM: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  DEVELOPER: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  CONTENT: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  SUPPORT: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  CLIENT: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
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
  return diff < 30 * 60 * 1000
}

export function ChannelList({ channels, selectedId, onSelect, onNewChannel, teamMembers = [], currentUserId, onStartDM }: ChannelListProps) {
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
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">Chat</h2>
          </div>
          <button
            onClick={onNewChannel}
            title="Nuovo Canale"
            className="h-8 w-8 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            placeholder="Cerca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-secondary/60 border-0 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-secondary transition-all duration-200"
          />
        </div>
      </div>

      {/* Team members */}
      {teamMembers.length > 0 && (
        <div className="px-2">
          <button
            onClick={() => setTeamExpanded(!teamExpanded)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-secondary/50 transition-colors duration-150"
          >
            <span className={cn(
              'transition-transform duration-200',
              teamExpanded ? 'rotate-0' : '-rotate-90'
            )}>
              <ChevronDown className="h-3 w-3 text-muted-foreground/60" />
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Team</span>
            {onlineCount > 0 && (
              <span className="ml-auto flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{onlineCount}</span>
              </span>
            )}
          </button>
          {teamExpanded && (
            <div className="pb-2 space-y-0.5 max-h-48 overflow-y-auto">
              {onlineMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => onStartDM?.(member.id)}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/60 transition-all duration-150 cursor-pointer group"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatarUrl} size="sm" className="!h-7 !w-7 !text-[10px] ring-2 ring-emerald-500/20 group-hover:ring-emerald-500/40 transition-all" />
                    <span className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-[2px] border-card bg-emerald-500 shadow-sm" />
                  </div>
                  <span className="text-[13px] text-foreground truncate font-medium">{member.firstName} {member.lastName}</span>
                  <span className={cn('text-[10px] font-semibold ml-auto flex-shrink-0 px-1.5 py-0.5 rounded-md', ROLE_COLORS[member.role] || 'bg-gray-500/10 text-gray-500')}>
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                </div>
              ))}
              {offlineMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => onStartDM?.(member.id)}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-secondary/60 transition-all duration-150 cursor-pointer group opacity-50 hover:opacity-70"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatarUrl} size="sm" className="!h-7 !w-7 !text-[10px] grayscale-[30%]" />
                    <span className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-[2px] border-card bg-gray-400" />
                  </div>
                  <span className="text-[13px] text-foreground truncate">{member.firstName} {member.lastName}</span>
                  <span className={cn('text-[10px] font-semibold ml-auto flex-shrink-0 px-1.5 py-0.5 rounded-md', ROLE_COLORS[member.role] || 'bg-gray-500/10 text-gray-500')}>
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Channels */}
      <div className="px-2 pt-1">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Canali</span>
          <span className="text-[10px] text-muted-foreground/50 font-medium">{filtered.length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="h-10 w-10 rounded-xl bg-secondary/80 mx-auto mb-3 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground/70 font-medium">Nessun canale</p>
            <p className="text-xs text-muted-foreground/40 mt-1">Crea il primo canale per iniziare</p>
          </div>
        ) : (
          filtered.map((channel) => {
            const Icon = TYPE_ICON[channel.type] || Hash
            const isSelected = channel.id === selectedId

            return (
              <button
                key={channel.id}
                onClick={() => onSelect(channel.id)}
                className={cn(
                  'w-full flex items-start gap-2.5 px-3 py-2.5 text-left rounded-lg transition-all duration-150 relative group',
                  isSelected
                    ? 'bg-primary/10 shadow-sm'
                    : 'hover:bg-secondary/60'
                )}
              >
                <div className={cn(
                  'flex-shrink-0 mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
                  isSelected ? 'bg-primary/20 text-primary' : 'bg-secondary/80 text-muted-foreground group-hover:bg-secondary group-hover:text-foreground'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      'text-[13px] truncate leading-tight',
                      isSelected ? 'text-primary font-semibold' : 'text-foreground font-medium',
                      channel.hasUnread && !isSelected && 'font-bold text-foreground'
                    )}>
                      {channel.name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {channel.lastMessage && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatTime(channel.lastMessage.createdAt)}
                        </span>
                      )}
                      {channel.hasUnread && !isSelected && (
                        <ChatUnreadBadge />
                      )}
                    </div>
                  </div>
                  {channel.lastMessage && (
                    <p className={cn(
                      'text-[12px] truncate mt-0.5 leading-tight',
                      channel.hasUnread && !isSelected ? 'text-muted-foreground/80' : 'text-muted-foreground/50'
                    )}>
                      <span className="font-medium">{channel.lastMessage.authorName.split(' ')[0]}:</span>{' '}
                      {channel.lastMessage.content}
                    </p>
                  )}
                </div>
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
