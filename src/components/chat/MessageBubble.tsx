'use client'

import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { Check, CheckCheck } from 'lucide-react'

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
      <div className="flex justify-center py-3">
        <span className="text-[11px] text-muted-foreground/60 bg-secondary/50 px-4 py-1.5 rounded-full font-medium">
          {message.content}
        </span>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex gap-3 px-4 md:px-6 py-1 group hover:bg-secondary/30 transition-colors duration-100',
      isOwn && 'flex-row-reverse'
    )}>
      {!isOwn ? (
        <Avatar
          src={message.author.avatarUrl}
          name={authorName}
          size="sm"
          className="flex-shrink-0 mt-0.5 ring-1 ring-border/50"
        />
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}
      <div className={cn('max-w-[75%] min-w-0', isOwn && 'flex flex-col items-end')}>
        <div className={cn('flex items-baseline gap-2 mb-0.5', isOwn && 'flex-row-reverse')}>
          {!isOwn && (
            <span className="text-[12px] font-semibold text-foreground/80">
              {authorName}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/40 font-medium">
            {time}
          </span>
        </div>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words shadow-sm',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-card border border-border/60 text-foreground rounded-bl-md'
          )}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {isOwn && (
          <div className="flex items-center gap-1 mt-0.5 pr-1">
            <CheckCheck className="h-3 w-3 text-primary/60" />
          </div>
        )}
      </div>
    </div>
  )
}
