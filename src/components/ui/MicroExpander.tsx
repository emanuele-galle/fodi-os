'use client'

import * as React from 'react'
import {
  motion,
  type HTMLMotionProps,
  type Variants,
  AnimatePresence,
} from 'motion/react'
import { Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MicroExpanderProps
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  text: string
  icon?: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  isLoading?: boolean
}

const MicroExpander = React.forwardRef<HTMLButtonElement, MicroExpanderProps>(
  (
    {
      text,
      icon,
      variant = 'default',
      isLoading = false,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const [isHovered, setIsHovered] = React.useState(false)

    const containerVariants: Variants = {
      initial: { width: '44px' },
      hover: { width: 'auto' },
      loading: { width: '44px' },
    }

    const textVariants: Variants = {
      initial: { opacity: 0, x: -10 },
      hover: {
        opacity: 1,
        x: 0,
        transition: { delay: 0.15, duration: 0.3, ease: 'easeOut' },
      },
      exit: {
        opacity: 0,
        x: -5,
        transition: { duration: 0.1, ease: 'linear' },
      },
    }

    const variantStyles = {
      default: 'bg-primary text-primary-foreground border border-primary',
      outline:
        'bg-transparent border border-border text-foreground hover:border-primary',
      ghost:
        'bg-secondary border border-transparent text-foreground hover:bg-secondary/80',
      destructive:
        'bg-destructive text-white border border-destructive hover:bg-destructive/90',
    }

    return (
      <motion.button
        ref={ref}
        className={cn(
          'relative flex h-11 items-center overflow-hidden rounded-full',
          'whitespace-nowrap font-medium text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          isLoading && 'cursor-not-allowed',
          variantStyles[variant],
          className
        )}
        initial='initial'
        animate={isLoading ? 'loading' : isHovered ? 'hover' : 'initial'}
        variants={containerVariants}
        transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 0.8 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        onClick={(e) => { if (!isLoading) onClick?.(e) }}
        disabled={isLoading}
        {...props}
        aria-label={text}
      >
        <div className='grid h-11 w-11 place-items-center shrink-0 z-10'>
          <AnimatePresence mode='popLayout'>
            {isLoading ? (
              <motion.div
                key='spinner'
                initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <Loader2 className='h-4 w-4 animate-spin' />
              </motion.div>
            ) : (
              <motion.div
                key='icon'
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                {icon || <Plus className='h-4 w-4' />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div variants={textVariants} className='pr-5 pl-0.5'>
          {text}
        </motion.div>
      </motion.button>
    )
  }
)

MicroExpander.displayName = 'MicroExpander'

export { MicroExpander }
export type { MicroExpanderProps }
