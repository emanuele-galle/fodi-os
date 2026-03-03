import { cn } from '@/lib/utils'
/* eslint-disable react-perf/jsx-no-new-object-as-prop -- dynamic styles */

// Base color tokens for status badges
const BLUE = 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20'
const AMBER = 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20'
const EMERALD = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
const ZINC = 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
const RED = 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20'

// Centralized status color map - use these for ALL status badges across the app
export const STATUS_COLORS: Record<string, string> = {
  // CRM Client Status
  LEAD: BLUE,
  PROSPECT: AMBER,
  ACTIVE: EMERALD,
  INACTIVE: ZINC,
  CHURNED: RED,
  LOST: RED,

  // Task Status
  TODO: ZINC,
  IN_PROGRESS: BLUE,
  IN_REVIEW: AMBER,
  DONE: EMERALD,
  CANCELLED: ZINC,

  // Project Status
  PLANNING: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  ON_HOLD: AMBER,
  REVIEW: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20',
  COMPLETED: EMERALD,

  // Quote/Invoice Status
  DRAFT: ZINC,
  SENT: BLUE,
  ACCEPTED: EMERALD,
  PAID: EMERALD,
  OVERDUE: RED,
  REJECTED: RED,
  EXPIRED: ZINC,

  // Signature Status
  PENDING: AMBER,
  OTP_SENT: BLUE,
  SIGNED: EMERALD,
  DECLINED: RED,

  // Priority
  LOW: ZINC,
  MEDIUM: BLUE,
  HIGH: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20',
  URGENT: RED,

  // Lead Status
  NEW: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
  CONTACTED: BLUE,
  QUALIFIED: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20',
  PROPOSAL_SENT: AMBER,
  CONVERTED: EMERALD,

  // Support Ticket Status
  OPEN: BLUE,
  WAITING: AMBER,
  RESOLVED: EMERALD,
  CLOSED: ZINC,
}

// Semantic variant styles (fallback for non-status usage)
const VARIANT_STYLES: Record<string, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: EMERALD,
  warning: AMBER,
  destructive: RED,
  info: BLUE,
  outline: 'border-border/50 text-foreground bg-transparent',
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'info'
  status?: string
  pulse?: boolean
  dotColor?: string
}

export function Badge({ className, variant = 'default', status, pulse, dotColor, ...props }: BadgeProps) {
  // If status is provided, use centralized status colors; otherwise fall back to variant
  const colorClasses = status
    ? STATUS_COLORS[status] || VARIANT_STYLES[variant]
    : VARIANT_STYLES[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-[3px] text-xs font-semibold border transition-colors duration-200',
        colorClasses,
        pulse && 'animate-pulse',
        dotColor && 'gap-1.5',
        className
      )}
      {...props}
    >
      {dotColor && (
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {props.children}
    </span>
  )
}
