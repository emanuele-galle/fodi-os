'use client'

import * as React from 'react'
import {
  motion,
  AnimatePresence,
  MotionConfig,
  type Transition,
} from 'motion/react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MorphButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string
  isLoading?: boolean
  icon?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

const MorphButton = React.forwardRef<HTMLButtonElement, MorphButtonProps>(
  (
    {
      text,
      isLoading = false,
      icon,
      variant = 'primary',
      size = 'md',
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const transition: Transition = {
      type: 'spring',
      stiffness: 150,
      damping: 25,
      mass: 1,
    }

    const variantStyles = {
      primary:
        'bg-primary text-primary-foreground border-primary hover:brightness-105 shadow-sm',
      secondary:
        'bg-card text-foreground border-border hover:bg-secondary shadow-sm',
      ghost:
        'bg-transparent text-foreground border-transparent hover:bg-secondary',
      destructive:
        'bg-destructive text-white border-destructive hover:bg-destructive/90 shadow-sm',
    }

    const sizeStyles = {
      sm: 'h-9 md:h-8 text-xs',
      md: 'h-11 md:h-10 text-sm',
      lg: 'h-12 text-base',
    }

    return (
      <MotionConfig transition={transition}>
        <motion.button
          ref={ref}
          layout
          className={cn(
            'relative flex items-center justify-center overflow-hidden rounded-full border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            isLoading ? 'px-0' : 'px-6',
            sizeStyles[size],
            variantStyles[variant],
            (props.disabled || isLoading) &&
              'opacity-50 cursor-not-allowed pointer-events-none',
            className
          )}
          onClick={(e) => !isLoading && onClick?.(e)}
          whileTap={!isLoading ? { scale: 0.97 } : undefined}
          {...(props as React.ComponentProps<typeof motion.button>)}
        >
          <AnimatePresence mode='popLayout' initial={false}>
            {isLoading ? (
              <motion.div
                key='loader'
                className='flex items-center justify-center'
                style={{ width: size === 'sm' ? '2rem' : '3rem' }}
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
              >
                <Loader2 className='h-4 w-4 animate-spin' />
              </motion.div>
            ) : (
              <motion.div
                key='content'
                className='flex items-center gap-2 whitespace-nowrap'
                initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              >
                {icon && <motion.span layout>{icon}</motion.span>}
                <motion.span layout>{text}</motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </MotionConfig>
    )
  }
)

MorphButton.displayName = 'MorphButton'

export { MorphButton }
export type { MorphButtonProps }
