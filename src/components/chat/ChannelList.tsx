'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Search, Plus, Hash, Lock, FolderKanban, ChevronDown, MessageCircle } from 'lucide-react'
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
  unreadCount?: number
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
  PROJECT: FolderKanban,
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  DIR_COMMERCIALE: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  DIR_TECNICO: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  DIR_SUPPORT: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  COMMERCIALE: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  PM: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  DEVELOPER: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  CONTENT: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  SUPPORT: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  CLIENT: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  DIR_COMMERCIALE: 'Dir. Comm.',
  DIR_TECNICO: 'Dir. Tech.',
  DIR_SUPPORT: 'Dir. Supp.',
  COMMERCIALE: 'Comm.',
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
  const [channelsExpanded, setChannelsExpanded] = useState(true)

  const filtered = channels.filter((ch) =>
    ch.name.toLowerCase().includes(search.toLowerCase())
  )

  // DM channels mapped by member name for unread badge
  const directChannels = filtered.filter(ch => ch.type === 'DIRECT')
  const regularChannels = filtered.filter(ch => ch.type !== 'DIRECT')

  // Build a map of DM channel by member name for quick lookup
  const dmByMemberName = new Map<string, ChannelItem>()
  for (const dm of directChannels) {
    dmByMemberName.set(dm.name.toLowerCase(), dm)
  }

  // Find DM for a member
  function findDmForMember(member: TeamMember): ChannelItem | undefined {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
    for (const dm of directChannels) {
      if (dm.name.toLowerCase().includes(fullName) || fullName.includes(dm.name.toLowerCase())) {
        return dm
      }
    }
    return undefined
  }

  const onlineMembers = teamMembers.filter((m) => isRecentlyActive(m.lastLoginAt) && m.id !== currentUserId)
  const offlineMembers = teamMembers.filter((m) => !isRecentlyActive(m.lastLoginAt) && m.id !== currentUserId)
  const onlineCount = onlineMembers.length

  // Filter members by search
  const filterMember = (m: TeamMember) =>
    !search || `${m.firstName} ${m.lastName}`.toLowerCase().includes(search.toLowerCase())

  const filteredOnline = onlineMembers.filter(filterMember)
  const filteredOffline = offlineMembers.filter(filterMember)

  function handleMemberClick(member: TeamMember) {
    // If there's already a DM channel, select it directly
    const existingDm = findDmForMember(member)
    if (existingDm) {
      onSelect(existingDm.id)
    } else {
      // Create a new DM
      onStartDM?.(member.id)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <MessageCircle className="h-4.5 w-4.5 text-primary" />
            </div>
            <h2 className="text-[15px] font-bold tracking-tight">Chat</h2>
          </div>
          <button
            onClick={onNewChannel}
            title="Nuovo Canale"
            className="h-8 w-8 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all duration-200 hover:scale-105 touch-manipulation"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted/60" />
          <input
            placeholder="Cerca persone o canali..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-lg bg-secondary/50 border border-border/30 placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-card transition-all duration-200"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        {/* Team members (clicking opens DM directly) */}
        {teamMembers.length > 0 && (
          <div className="px-2 mb-1">
            <button
              onClick={() => setTeamExpanded(!teamExpanded)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-md hover:bg-secondary/40 transition-colors duration-150"
            >
              <ChevronDown className={cn(
                'h-3 w-3 text-muted/60 transition-transform duration-200',
                !teamExpanded && '-rotate-90'
              )} />
              <span className="text-[11px] font-semibold text-muted/70 uppercase tracking-wider">Persone</span>
              {onlineCount > 0 && (
                <span className="ml-auto flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{onlineCount}</span>
                </span>
              )}
            </button>
            {teamExpanded && (
              <div className="pb-1 space-y-px mt-0.5">
                {filteredOnline.map((member) => {
                  const dm = findDmForMember(member)
                  const isSelected = dm ? dm.id === selectedId : false
                  const unread = dm && !isSelected ? (dm.unreadCount || 0) : 0

                  return (
                    <button
                      key={member.id}
                      onClick={() => handleMemberClick(member)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 text-left group',
                        isSelected
                          ? 'bg-primary/10'
                          : 'hover:bg-secondary/50'
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatarUrl} size="sm" className="!h-8 !w-8 !text-[11px]" />
                        <span className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            'text-[13px] truncate',
                            isSelected ? 'text-primary font-semibold' : 'text-foreground font-medium',
                            unread > 0 && 'font-bold'
                          )}>
                            {member.firstName} {member.lastName}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {dm?.lastMessage && (
                              <span className="text-[10px] text-muted/50">
                                {formatTime(dm.lastMessage.createdAt)}
                              </span>
                            )}
                            {unread > 0 && <ChatUnreadBadge count={unread} />}
                          </div>
                        </div>
                        {dm?.lastMessage ? (
                          <p className={cn(
                            'text-[11px] truncate mt-0.5',
                            unread > 0 ? 'text-muted/70' : 'text-muted/45'
                          )}>
                            {dm.lastMessage.content}
                          </p>
                        ) : (
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md', ROLE_COLORS[member.role] || 'bg-gray-500/10 text-gray-500')}>
                            {ROLE_LABELS[member.role] || member.role}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
                {filteredOffline.map((member) => {
                  const dm = findDmForMember(member)
                  const isSelected = dm ? dm.id === selectedId : false
                  const unread = dm && !isSelected ? (dm.unreadCount || 0) : 0

                  return (
                    <button
                      key={member.id}
                      onClick={() => handleMemberClick(member)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 text-left group',
                        isSelected
                          ? 'bg-primary/10'
                          : 'hover:bg-secondary/50',
                        unread === 0 && !isSelected && 'opacity-50 hover:opacity-70'
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar name={`${member.firstName} ${member.lastName}`} src={member.avatarUrl} size="sm" className="!h-8 !w-8 !text-[11px]" />
                        <span className="absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-card bg-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            'text-[13px] truncate',
                            isSelected ? 'text-primary font-semibold' : 'text-foreground font-medium',
                            unread > 0 && 'font-bold opacity-100'
                          )}>
                            {member.firstName} {member.lastName}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {dm?.lastMessage && (
                              <span className="text-[10px] text-muted/50">
                                {formatTime(dm.lastMessage.createdAt)}
                              </span>
                            )}
                            {unread > 0 && <ChatUnreadBadge count={unread} />}
                          </div>
                        </div>
                        {dm?.lastMessage ? (
                          <p className="text-[11px] truncate mt-0.5 text-muted/45">
                            {dm.lastMessage.content}
                          </p>
                        ) : (
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md', ROLE_COLORS[member.role] || 'bg-gray-500/10 text-gray-500')}>
                            {ROLE_LABELS[member.role] || member.role}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Separator */}
        {teamMembers.length > 0 && regularChannels.length > 0 && (
          <div className="h-px bg-border/30 mx-4 my-1" />
        )}

        {/* Channels */}
        {regularChannels.length > 0 && (
          <div className="px-2">
            <button
              onClick={() => setChannelsExpanded(!channelsExpanded)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left rounded-md hover:bg-secondary/40 transition-colors duration-150"
            >
              <ChevronDown className={cn(
                'h-3 w-3 text-muted/60 transition-transform duration-200',
                !channelsExpanded && '-rotate-90'
              )} />
              <span className="text-[11px] font-semibold text-muted/70 uppercase tracking-wider">Canali</span>
              <span className="text-[10px] text-muted/40 font-medium">{regularChannels.length}</span>
            </button>
            {channelsExpanded && (
              <div className="pb-2 space-y-px mt-0.5">
                {regularChannels.map((channel) => {
                  const Icon = TYPE_ICON[channel.type] || Hash
                  const isSelected = channel.id === selectedId
                  const unread = !isSelected ? (channel.unreadCount || 0) : 0

                  return (
                    <button
                      key={channel.id}
                      onClick={() => onSelect(channel.id)}
                      className={cn(
                        'w-full flex items-start gap-2.5 px-2.5 py-2 text-left rounded-lg transition-all duration-150 relative group',
                        isSelected
                          ? 'bg-primary/10'
                          : 'hover:bg-secondary/50'
                      )}
                    >
                      <div className={cn(
                        'flex-shrink-0 mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
                        isSelected ? 'bg-primary/20 text-primary' : 'bg-secondary/60 text-muted group-hover:bg-secondary group-hover:text-foreground'
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            'text-[13px] truncate leading-tight',
                            isSelected ? 'text-primary font-semibold' : 'text-foreground font-medium',
                            unread > 0 && 'font-bold text-foreground'
                          )}>
                            {channel.name}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {channel.lastMessage && (
                              <span className="text-[10px] text-muted/50">
                                {formatTime(channel.lastMessage.createdAt)}
                              </span>
                            )}
                            {unread > 0 && (
                              <ChatUnreadBadge count={unread} />
                            )}
                          </div>
                        </div>
                        {channel.lastMessage && (
                          <p className={cn(
                            'text-[11px] truncate mt-0.5 leading-tight',
                            unread > 0 ? 'text-muted/70' : 'text-muted/45'
                          )}>
                            <span className="font-medium">{channel.lastMessage.authorName.split(' ')[0]}:</span>{' '}
                            {channel.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {regularChannels.length === 0 && teamMembers.length === 0 && (
          <div className="text-center py-10 px-4">
            <div className="h-10 w-10 rounded-xl bg-secondary/80 mx-auto mb-3 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-muted/50" />
            </div>
            <p className="text-sm text-muted/70 font-medium">Nessun canale</p>
            <p className="text-xs text-muted/40 mt-1">Crea il primo canale per iniziare</p>
          </div>
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
