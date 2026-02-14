import { cn } from '@/lib/utils'

// Centralized status color map - use these for ALL status badges across the app
export const STATUS_COLORS: Record<string, string> = {
  // CRM Client Status
  LEAD: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
  PROSPECT: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  ACTIVE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  INACTIVE: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  CHURNED: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',
  LOST: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',

  // Task Status
  TODO: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
  IN_REVIEW: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  DONE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  CANCELLED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',

  // Project Status
  PLANNING: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  ON_HOLD: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  REVIEW: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20',
  COMPLETED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',

  // Quote/Invoice Status
  DRAFT: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  SENT: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
  ACCEPTED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  PAID: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  OVERDUE: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',
  REJECTED: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',
  EXPIRED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',

  // Signature Status
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  OTP_SENT: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
  SIGNED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  DECLINED: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',

  // Priority
  LOW: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
  MEDIUM: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
  HIGH: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20',
  URGENT: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',

  // Support Ticket Status
  OPEN: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
  WAITING: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  RESOLVED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  CLOSED: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
}

// Semantic variant styles (fallback for non-status usage)
const VARIANT_STYLES: Record<string, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  destructive: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20',
  info: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
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
        'inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium border transition-colors duration-200',
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
