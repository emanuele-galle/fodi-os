'use client'

import { cn } from '@/lib/utils'
import { forwardRef, useId } from 'react'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const generatedId = useId()
    const textareaId = id || generatedId
    const errorId = `${textareaId}-error`
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'flex w-full rounded-[10px] border bg-card px-3 py-2 text-base md:text-sm transition-all min-h-[80px] resize-y shadow-[var(--shadow-sm)]',
            'placeholder:text-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40',
            error ? 'border-destructive' : 'border-border/40',
            className
          )}
          {...props}
        />
        {error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
