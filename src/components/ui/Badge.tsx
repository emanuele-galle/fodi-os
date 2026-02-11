import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline'
  pulse?: boolean
}

export function Badge({ className, variant = 'default', pulse, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200',
        {
          'bg-primary/10 text-primary': variant === 'default',
          'bg-green-100 text-green-800': variant === 'success',
          'bg-amber-100 text-amber-800': variant === 'warning',
          'bg-red-100 text-red-800': variant === 'destructive',
          'border border-border text-foreground': variant === 'outline',
        },
        pulse && 'animate-pulse',
        className
      )}
      {...props}
    />
  )
}
