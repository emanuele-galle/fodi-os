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
  const logoDark = brandClient.logo.dark
  const logoLight = brandClient.logo.light
  const isSvg = logoDark.endsWith('.svg') || logoLight.endsWith('.svg')

  if (variant === 'auto') {
    return (
      <>
        {isSvg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoDark} alt={brandClient.name} width={width} height={height} className={cn('logo-light-only', className)} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoLight} alt={brandClient.name} width={width} height={height} className={cn('logo-dark-only', className)} />
          </>
        ) : (
          <>
            <Image src={logoDark} alt={brandClient.name} width={width} height={height} priority className={cn('logo-light-only', className)} />
            <Image src={logoLight} alt={brandClient.name} width={width} height={height} priority className={cn('logo-dark-only', className)} />
          </>
        )}
      </>
    )
  }

  const src = variant === 'light' ? logoDark : logoLight

  if (isSvg) {
    // SVG logos: use <img> to avoid Next.js Image optimization issues with SVG
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={brandClient.name} width={width} height={height} className={className} />
  }

  return (
    <Image
      src={src}
      alt={brandClient.name}
      width={width}
      height={height}
      priority
      className={className}
    />
  )
}
