import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass'
}

export function Card({
  className,
  variant = 'default',
  children,
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        'rounded-xl border border-border/40 bg-card p-4 md:p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-header" className={cn('mb-4 flex items-center justify-between flex-wrap gap-2.5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 data-slot="card-title" className={cn('text-base font-semibold text-foreground leading-none tracking-tight', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p data-slot="card-description" className={cn('text-sm text-muted', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-content" className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-footer" className={cn('flex items-center pt-4 border-t border-border/30 mt-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeading({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-heading" className={cn('space-y-1', className)} {...props}>
      {children}
    </div>
  )
}

export function CardToolbar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-toolbar" className={cn('flex items-center gap-2.5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTable({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="card-table" className={cn('grid grow', className)} {...props}>
      {children}
    </div>
  )
}
