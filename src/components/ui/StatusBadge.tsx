import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type StatusVariant = 'success' | 'error' | 'warning' | 'default' | 'info'

interface StatusBadgeProps {
  leftLabel: string
  rightLabel: string
  variant?: StatusVariant
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  className?: string
  pulse?: boolean
}

const variantStyles: Record<StatusVariant, { bg: string; text: string; dot: string; divider: string }> = {
  success: {
    bg: 'bg-green-500/8',
    text: 'text-green-600',
    dot: 'bg-green-500',
    divider: 'bg-green-500/20',
  },
  error: {
    bg: 'bg-red-500/8',
    text: 'text-red-600',
    dot: 'bg-red-500',
    divider: 'bg-red-500/20',
  },
  warning: {
    bg: 'bg-amber-500/8',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    divider: 'bg-amber-500/20',
  },
  info: {
    bg: 'bg-blue-500/8',
    text: 'text-blue-600',
    dot: 'bg-blue-500',
    divider: 'bg-blue-500/20',
  },
  default: {
    bg: 'bg-secondary/50',
    text: 'text-foreground/80',
    dot: 'bg-muted',
    divider: 'bg-border',
  },
}

export function StatusBadge({
  leftLabel,
  rightLabel,
  variant = 'default',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className,
  pulse,
}: StatusBadgeProps) {
  const s = variantStyles[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full text-xs font-medium border border-transparent',
        s.bg,
        s.text,
        className
      )}
    >
      {/* Left section */}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5">
        {LeftIcon ? (
          <LeftIcon className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <span className={cn('h-2 w-2 rounded-full flex-shrink-0', s.dot, pulse && 'animate-pulse')} />
        )}
        <span>{leftLabel}</span>
      </span>

      {/* Divider */}
      <span className={cn('w-px h-3.5 flex-shrink-0', s.divider)} aria-hidden />

      {/* Right section */}
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5">
        {RightIcon && <RightIcon className="h-3.5 w-3.5" aria-hidden />}
        <span>{rightLabel}</span>
      </span>
    </span>
  )
}
