import { cn } from '@/lib/utils'

interface ChatUnreadBadgeProps {
  count?: number
  className?: string
}

export function ChatUnreadBadge({ count, className }: ChatUnreadBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0',
        count
          ? 'min-w-[20px] h-5 px-1.5 text-xs'
          : 'w-2.5 h-2.5',
        className
      )}
    >
      {count ? (count > 99 ? '99+' : count) : null}
    </span>
  )
}
