'use client'
/* eslint-disable react-perf/jsx-no-new-object-as-prop -- dynamic styles */

import { useRef, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptic'

interface SwipeAction {
  label: string
  icon?: React.ReactNode
  color: string
  onAction: () => void
}

interface SwipeableRowProps {
  children: React.ReactNode
  leftAction?: SwipeAction
  rightAction?: SwipeAction
  className?: string
  /** Threshold in px to trigger action (default 80) */
  threshold?: number
}

const THRESHOLD_DEFAULT = 80

function clampSwipeX(
  deltaX: number,
  hasLeft: boolean,
  hasRight: boolean,
  threshold: number,
): number {
  let clamped = deltaX
  if (clamped > 0 && !hasLeft) return 0
  if (clamped < 0 && !hasRight) return 0

  const maxSwipe = threshold * 1.5
  if (Math.abs(clamped) > threshold) {
    const excess = Math.abs(clamped) - threshold
    clamped = Math.sign(clamped) * (threshold + excess * 0.3)
  }
  return Math.max(-maxSwipe, Math.min(maxSwipe, clamped))
}

export function SwipeableRow({
  children,
  leftAction,
  rightAction,
  className,
  threshold = THRESHOLD_DEFAULT,
}: SwipeableRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const currentX = useRef(0)
  const isDragging = useRef(false)
  const isHorizontal = useRef<boolean | null>(null)
  const [offset, setOffset] = useState(0)
  const [triggered, setTriggered] = useState<'left' | 'right' | null>(null)

  const reset = useCallback(() => {
    setOffset(0)
    setTriggered(null)
    isDragging.current = false
    isHorizontal.current = null
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.25s ease-out'
      rowRef.current.style.transform = ''
      setTimeout(() => {
        if (rowRef.current) rowRef.current.style.transition = ''
      }, 250)
    }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isDragging.current = true
    isHorizontal.current = null
    if (rowRef.current) rowRef.current.style.transition = ''
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return

    const deltaX = e.touches[0].clientX - startX.current
    const deltaY = e.touches[0].clientY - startY.current

    // Determine swipe direction on first significant movement
    if (isHorizontal.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY)
      }
      return
    }

    if (!isHorizontal.current) return

    const clampedX = clampSwipeX(deltaX, !!leftAction, !!rightAction, threshold)
    currentX.current = clampedX
    setOffset(clampedX)

    if (rowRef.current) {
      rowRef.current.style.transform = `translateX(${clampedX}px)`
    }

    const newTriggered = clampedX > threshold ? 'left' : clampedX < -threshold ? 'right' : null
    if (newTriggered && !triggered) {
      haptic('medium')
    }
    setTriggered(newTriggered)
  }, [leftAction, rightAction, threshold, triggered])

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return

    const finalX = currentX.current

    if (finalX > threshold && leftAction) {
      haptic('medium')
      leftAction.onAction()
    } else if (finalX < -threshold && rightAction) {
      haptic('medium')
      rightAction.onAction()
    }

    reset()
  }, [threshold, leftAction, rightAction, reset])

  const leftRevealed = offset > 10
  const rightRevealed = offset < -10
  const leftTriggered = offset > threshold
  const rightTriggered = offset < -threshold

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Left action background */}
      {leftAction && leftRevealed && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center pl-4 transition-opacity duration-100',
            leftTriggered ? 'opacity-100' : 'opacity-60'
          )}
          style={{ width: Math.abs(offset), backgroundColor: leftAction.color }}
        >
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            {leftAction.icon}
            {leftTriggered && <span>{leftAction.label}</span>}
          </div>
        </div>
      )}

      {/* Right action background */}
      {rightAction && rightRevealed && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end pr-4 transition-opacity duration-100',
            rightTriggered ? 'opacity-100' : 'opacity-60'
          )}
          style={{ width: Math.abs(offset), backgroundColor: rightAction.color }}
        >
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            {rightTriggered && <span>{rightAction.label}</span>}
            {rightAction.icon}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        ref={rowRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-card touch-manipulation"
      >
        {children}
      </div>
    </div>
  )
}
