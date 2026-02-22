'use client'
import { brandClient } from '@/lib/branding-client'

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
          src="/logo-dark.png"
          alt={brandClient.name}
          width={width}
          height={height}
          priority
          className={cn('logo-light-only', className)}
        />
        <Image
          src="/logo-light.png"
          alt={brandClient.name}
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
      src={variant === 'light' ? '/logo-dark.png' : '/logo-light.png'}
      alt={brandClient.name}
      width={width}
      height={height}
      priority
      className={className}
    />
  )
}
