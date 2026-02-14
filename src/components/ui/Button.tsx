'use client'

import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'sm' | 'md' | 'default' | 'lg' | 'icon'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const resolvedVariant = variant === 'default' ? 'primary' : variant
    const resolvedSize = size === 'default' ? 'md' : size

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'btn-ripple inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
          {
            'bg-primary text-primary-foreground font-semibold shadow-[0_1px_3px_rgba(124,58,237,0.3)] hover:bg-primary-hover hover:shadow-[0_4px_12px_rgba(124,58,237,0.25)]': resolvedVariant === 'primary',
            'bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80': resolvedVariant === 'secondary',
            'border border-border/60 bg-transparent font-medium rounded-lg hover:bg-secondary/50': resolvedVariant === 'outline',
            'bg-transparent font-medium hover:bg-secondary/60': resolvedVariant === 'ghost',
            'bg-destructive text-white font-medium hover:bg-destructive/90 hover:shadow-md': resolvedVariant === 'destructive',
            'text-primary font-medium underline-offset-4 hover:underline bg-transparent': resolvedVariant === 'link',
          },
          {
            'h-9 md:h-8 px-3 text-sm min-h-[44px] md:min-h-0': resolvedSize === 'sm',
            'h-11 md:h-10 px-4 text-sm min-h-[44px] md:min-h-0': resolvedSize === 'md',
            'h-12 px-6 text-base': resolvedSize === 'lg',
            'h-11 w-11 md:h-10 md:w-10 p-0 min-h-[44px] md:min-h-0': resolvedSize === 'icon',
          },
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
