import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'dot'
  pulse?: boolean
  dotColor?: string
}

export function Badge({ className, variant = 'default', pulse, dotColor, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200',
        {
          'bg-gradient-to-r from-primary/15 to-primary/5 text-primary border border-primary/20': variant === 'default',
          'bg-gradient-to-r from-green-500/15 to-green-500/5 text-green-700 border border-green-500/20': variant === 'success',
          'bg-gradient-to-r from-amber-500/15 to-amber-500/5 text-amber-700 border border-amber-500/20': variant === 'warning',
          'bg-gradient-to-r from-red-500/15 to-red-500/5 text-red-700 border border-red-500/20': variant === 'destructive',
          'border border-border text-foreground bg-transparent': variant === 'outline',
          'bg-secondary/50 text-foreground gap-1.5': variant === 'dot',
        },
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    >
      {variant === 'dot' && (
        <span
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor || 'currentColor' }}
        />
      )}
      {props.children}
    </span>
  )
}
