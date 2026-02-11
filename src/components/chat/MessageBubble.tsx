'use client'

import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: {
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
  isOwn: boolean
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const authorName = `${message.author.firstName} ${message.author.lastName}`
  const time = new Date(message.createdAt).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-muted bg-secondary/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-3 px-4 py-1.5 group', isOwn && 'flex-row-reverse')}>
      {!isOwn && (
        <Avatar
          src={message.author.avatarUrl}
          name={authorName}
          size="sm"
          className="flex-shrink-0 mt-1"
        />
      )}
      <div className={cn('max-w-[70%] min-w-0', isOwn && 'items-end')}>
        {!isOwn && (
          <span className="text-xs font-medium text-primary mb-0.5 block">
            {authorName}
          </span>
        )}
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm break-words',
            isOwn
              ? 'bg-primary/10 text-foreground rounded-tr-sm'
              : 'bg-secondary text-foreground rounded-tl-sm'
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <span className={cn('text-[10px] text-muted mt-0.5 block', isOwn && 'text-right')}>
          {time}
        </span>
      </div>
    </div>
  )
}
