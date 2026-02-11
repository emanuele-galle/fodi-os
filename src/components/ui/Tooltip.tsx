import { cn } from '@/lib/utils'

interface TooltipProps {
  content: string
  position?: 'top' | 'right' | 'bottom' | 'left'
  children: React.ReactNode
  className?: string
}

export function Tooltip({ content, position = 'top', children, className }: TooltipProps) {
  const positionClass = {
    top: 'tooltip-top',
    right: 'tooltip-right',
    bottom: 'bottom-auto top-[calc(100%+6px)] left-1/2 -translate-x-1/2',
    left: 'right-[calc(100%+6px)] top-1/2 -translate-y-1/2',
  }[position]

  return (
    <span className={cn('tooltip-wrapper', className)}>
      {children}
      <span className={cn('tooltip-content', positionClass)}>
        {content}
      </span>
    </span>
  )
}
