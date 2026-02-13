import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'dot' | 'info'
  pulse?: boolean
  dotColor?: string
}

export function Badge({ className, variant = 'default', pulse, dotColor, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors duration-200',
        {
          'bg-primary/10 text-primary': variant === 'default',
          'bg-emerald-500/10 text-emerald-600': variant === 'success',
          'bg-amber-500/10 text-amber-600': variant === 'warning',
          'bg-red-500/10 text-red-600': variant === 'destructive',
          'bg-indigo-500/10 text-indigo-600': variant === 'info',
          'border border-border/50 text-foreground bg-transparent': variant === 'outline',
          'bg-secondary/60 text-foreground gap-1.5': variant === 'dot',
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
