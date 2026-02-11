'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Search, Plus, Hash, Lock, Users, FolderKanban } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
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

interface ChannelListProps {
  channels: ChannelItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNewChannel: () => void
}

const TYPE_ICON: Record<string, React.ElementType> = {
  PUBLIC: Hash,
  PRIVATE: Lock,
  DIRECT: Users,
  PROJECT: FolderKanban,
}

export function ChannelList({ channels, selectedId, onSelect, onNewChannel }: ChannelListProps) {
  const [search, setSearch] = useState('')

  const filtered = channels.filter((ch) =>
    ch.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/10">
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

      <div className="flex-1 overflow-y-auto py-2">
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
                  'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors relative',
                  isSelected
                    ? 'bg-sidebar-active/15 border-l-3 border-[#C4A052]'
                    : 'hover:bg-white/5 border-l-3 border-transparent'
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className={cn('h-4 w-4', isSelected ? 'text-[#D4B566]' : 'text-muted')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-sm font-medium truncate',
                      isSelected ? 'text-[#D4B566]' : 'text-foreground',
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
