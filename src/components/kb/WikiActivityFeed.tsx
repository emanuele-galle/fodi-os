'use client'

import { Edit, MessageSquare } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

export interface ActivityItem {
  type: 'edit' | 'comment'
  id: string
  pageId: string
  pageTitle: string
  user: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
  content: string
  createdAt: string
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'ora'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m fa`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h fa`
  const days = Math.floor(hours / 24)
  return `${days}g fa`
}

export function WikiActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-8">Nessuna attivita recente.</p>
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.type === 'edit' ? Edit : MessageSquare
        const userName = `${item.user.firstName} ${item.user.lastName}`
        const actionText = item.type === 'edit' ? 'ha modificato' : 'ha commentato su'

        return (
          <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
            <div className="mt-0.5">
              <Avatar
                src={item.user.avatarUrl}
                name={userName}
                size="sm"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <Icon className="h-3.5 w-3.5 text-muted shrink-0" />
                <span className="font-medium text-foreground">{userName}</span>
                <span className="text-muted">{actionText}</span>
                <span className="font-medium text-primary truncate">{item.pageTitle}</span>
              </div>
              {item.content && (
                <p className="text-xs text-muted mt-1 line-clamp-2">{item.content}</p>
              )}
            </div>
            <span className="text-xs text-muted whitespace-nowrap shrink-0">{timeAgo(item.createdAt)}</span>
          </div>
        )
      })}
    </div>
  )
}
