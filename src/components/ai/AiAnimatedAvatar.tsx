'use client'

import { cn } from '@/lib/utils'

interface AiAnimatedAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'w-8 h-8',
  md: 'w-9 h-9',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
}

export function AiAnimatedAvatar({ size = 'sm', className }: AiAnimatedAvatarProps) {
  return (
    <div className={cn('relative', sizes[size], className)}>
      {/* Animated gradient orb */}
      <div className="absolute inset-0 rounded-xl overflow-hidden ai-avatar-orb">
        <div className="ai-avatar-orb-inner" />
        {/* Glass overlay */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 via-transparent to-transparent" />
      </div>
      {/* AI icon SVG overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={cn(
            'text-white drop-shadow-[0_0_4px_rgba(139,92,246,0.6)]',
            size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-[18px] h-[18px]' : size === 'lg' ? 'w-7 h-7' : 'w-10 h-10',
          )}
        >
          {/* Neural network / brain AI icon */}
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.3"
          />
          <circle cx="12" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="13" r="1.5" fill="currentColor" />
          <circle cx="16" cy="13" r="1.5" fill="currentColor" />
          <circle cx="12" cy="17" r="1.2" fill="currentColor" opacity="0.7" />
          <line x1="12" y1="9.5" x2="8.5" y2="11.8" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
          <line x1="12" y1="9.5" x2="15.5" y2="11.8" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
          <line x1="8.5" y1="14.2" x2="11.5" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
          <line x1="15.5" y1="14.2" x2="12.5" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
          <line x1="9.5" y1="13" x2="14.5" y2="13" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
        </svg>
      </div>
      {/* Online indicator */}
      <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 z-20">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-background" />
      </span>
    </div>
  )
}
