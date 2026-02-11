'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  /** 'light' = white text (for dark backgrounds), 'dark' = dark text (for light backgrounds), 'auto' = switch based on theme */
  variant?: 'light' | 'dark' | 'auto'
  width?: number
  height?: number
  className?: string
}

export function Logo({ variant = 'light', width = 120, height = 42, className }: LogoProps) {
  if (variant === 'auto') {
    return (
      <>
        <Image
          src="/logo-fodi.png"
          alt="FODI"
          width={width}
          height={height}
          priority
          className={cn('logo-light-only', className)}
        />
        <Image
          src="/logo-fodi.png"
          alt="FODI"
          width={width}
          height={height}
          priority
          className={cn('logo-dark-only', className)}
        />
      </>
    )
  }

  return (
    <Image
      src="/logo-fodi.png"
      alt="FODI"
      width={width}
      height={height}
      priority
      className={cn(
        variant === 'dark' && 'logo-inverted',
        className
      )}
    />
  )
}
