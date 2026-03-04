'use client'
/* eslint-disable react-perf/jsx-no-new-object-as-prop -- dynamic styles */

import { useEffect, useRef, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptic'
import { X } from 'lucide-react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  /** Max height as vh (default 85) */
  maxHeight?: number
  /** Show drag handle (default true) */
  showHandle?: boolean
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
  maxHeight = 85,
  showHandle = true,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const currentTranslateY = useRef(0)
  const [closing, setClosing] = useState(false)

  const closeSheet = useCallback(() => {
    setClosing(true)
    haptic('light')
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, 250)
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
      haptic('light')
    }
    return () => {
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, closeSheet])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    currentTranslateY.current = 0
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - dragStartY.current
    if (deltaY > 0 && sheetRef.current) {
      currentTranslateY.current = deltaY
      sheetRef.current.style.transform = `translateY(${deltaY}px)`
      sheetRef.current.style.transition = 'none'
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!sheetRef.current) return
    if (currentTranslateY.current > 100) {
      closeSheet()
    } else {
      sheetRef.current.style.transition = 'transform 0.2s ease-out'
      sheetRef.current.style.transform = ''
    }
    currentTranslateY.current = 0
  }, [closeSheet])

  if (!open && !closing) return null

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/30 backdrop-blur-2xl transition-opacity duration-250',
          closing ? 'opacity-0' : 'opacity-100'
        )}
        onClick={closeSheet}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ maxHeight: `${maxHeight}vh` }}
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur-2xl saturate-[1.8] border-t border-border/20 rounded-t-xl overflow-hidden flex flex-col shadow-[var(--shadow-xl)]',
          closing ? 'animate-menu-slide-down' : 'animate-menu-slide-up',
          className
        )}
      >
        {/* Drag handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing flex-shrink-0">
            <div className="w-10 h-1.5 rounded-full bg-muted/40" />
          </div>
        )}

        {/* Title */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 flex-shrink-0">
            <h3 id="bottom-sheet-title" className="text-base font-semibold">{title}</h3>
            <button
              onClick={closeSheet}
              aria-label="Chiudi"
              className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary/60 active:bg-secondary/80 transition-colors touch-manipulation"
            >
              <X className="h-4 w-4 text-muted" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
      </div>
    </div>
  )
}
