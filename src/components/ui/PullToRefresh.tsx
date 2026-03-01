'use client'

import { useRef, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptic'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
  /** Pull distance to trigger refresh in px (default 60) */
  threshold?: number
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 60,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [triggered, setTriggered] = useState(false)
  const pulling = useRef(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return
    const el = containerRef.current
    if (!el || el.scrollTop > 0) return
    startY.current = e.touches[0].clientY
    pulling.current = true
  }, [refreshing])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return

    const deltaY = e.touches[0].clientY - startY.current
    if (deltaY < 0) {
      pulling.current = false
      setPullDistance(0)
      return
    }

    // Dampen the pull
    const dampened = Math.min(deltaY * 0.5, threshold * 2)
    setPullDistance(dampened)

    if (dampened >= threshold && !triggered) {
      setTriggered(true)
      haptic('medium')
    } else if (dampened < threshold && triggered) {
      setTriggered(false)
    }
  }, [refreshing, threshold, triggered])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false

    if (pullDistance >= threshold) {
      setRefreshing(true)
      setPullDistance(threshold * 0.6) // Hold at indicator position
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
        setTriggered(false)
      }
    } else {
      setPullDistance(0)
      setTriggered(false)
    }
  }, [pullDistance, threshold, onRefresh])

  const progress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn('relative md:contents', className)}
    >
      {/* Pull indicator - only visible on mobile */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="md:hidden flex items-center justify-center overflow-hidden transition-[height] duration-200"
          style={{ height: pullDistance > 0 ? pullDistance : refreshing ? threshold * 0.6 : 0 }}
        >
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full bg-card border border-border/40 shadow-sm',
              refreshing && 'animate-spin'
            )}
            style={{ opacity: progress, transform: `rotate(${progress * 360}deg)` }}
          >
            <RefreshCw className={cn('h-4 w-4', triggered || refreshing ? 'text-primary' : 'text-muted')} />
          </div>
        </div>
      )}

      {children}
    </div>
  )
}
