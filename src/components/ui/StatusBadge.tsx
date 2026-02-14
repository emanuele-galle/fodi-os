import { cn } from '@/lib/utils'
import { STATUS_COLORS } from './Badge'
import type { LucideIcon } from 'lucide-react'

type StatusVariant = 'success' | 'error' | 'warning' | 'default' | 'info'

interface StatusBadgeProps {
  leftLabel: string
  rightLabel: string
  variant?: StatusVariant
  status?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  className?: string
  pulse?: boolean
}

const variantStyles: Record<StatusVariant, { bg: string; text: string; dot: string; divider: string }> = {
  success: {
    bg: 'bg-emerald-500/8',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    divider: 'bg-emerald-500/20',
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
    bg: 'bg-indigo-500/8',
    text: 'text-indigo-600',
    dot: 'bg-indigo-500',
    divider: 'bg-indigo-500/20',
  },
  default: {
    bg: 'bg-secondary/50',
    text: 'text-foreground/80',
    dot: 'bg-muted',
    divider: 'bg-border',
  },
}

// Map centralized status to variant for StatusBadge
function statusToVariant(status: string): StatusVariant {
  const colors = STATUS_COLORS[status]
  if (!colors) return 'default'
  if (colors.includes('emerald')) return 'success'
  if (colors.includes('red') || colors.includes('orange')) return 'error'
  if (colors.includes('amber')) return 'warning'
  if (colors.includes('blue') || colors.includes('indigo') || colors.includes('purple')) return 'info'
  return 'default'
}

export function StatusBadge({
  leftLabel,
  rightLabel,
  variant,
  status,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className,
  pulse,
}: StatusBadgeProps) {
  const resolvedVariant = status ? statusToVariant(status) : (variant || 'default')
  const s = variantStyles[resolvedVariant]

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
