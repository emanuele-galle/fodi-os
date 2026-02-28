'use client'

import { cn } from '@/lib/utils'
import { useEffect, useRef, useCallback, useState } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  preventAccidentalClose?: boolean
}

export function Modal({ open, onClose, title, children, className, size = 'md', preventAccidentalClose = false }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number | null>(null)
  const touchDeltaY = useRef(0)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const attemptClose = useCallback(() => {
    if (preventAccidentalClose) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }, [preventAccidentalClose, onClose])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') attemptClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
    }
  }, [open, attemptClose])

  // Reset confirm state when modal opens/closes
   
  useEffect(() => {
    if (!open) setShowCloseConfirm(false)
  }, [open])

  // Swipe-to-dismiss on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (preventAccidentalClose) return
    const el = contentRef.current
    if (!el) return
    if (el.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }, [preventAccidentalClose])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const delta = e.touches[0].clientY - touchStartY.current
    touchDeltaY.current = delta
    const el = contentRef.current
    if (el && delta > 0) {
      el.style.transform = `translateY(${Math.min(delta * 0.5, 150)}px)`
      el.style.opacity = `${Math.max(1 - delta / 400, 0.5)}`
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    const el = contentRef.current
    if (el) {
      el.style.transform = ''
      el.style.opacity = ''
    }
    if (touchDeltaY.current > 200) {
      onClose()
    }
    touchStartY.current = null
    touchDeltaY.current = 0
  }, [onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-stretch md:items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === overlayRef.current && attemptClose()}
    >
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          'bg-card/95 backdrop-blur-xl shadow-[var(--shadow-xl)] border border-border/30 animate-scale-in flex flex-col',
          // Mobile: full-screen sheet
          'w-full h-[100dvh] rounded-none',
          // Desktop: centered dialog
          'md:h-auto md:max-h-[85vh] md:rounded-xl',
          {
            'md:max-w-sm': size === 'sm',
            'md:max-w-md': size === 'md',
            'md:max-w-lg': size === 'lg',
            'md:max-w-2xl': size === 'xl',
          },
          className
        )}
      >
        {/* Swipe indicator on mobile (hidden when swipe disabled) */}
        {!preventAccidentalClose && (
          <div className="md:hidden flex justify-center pt-2 pb-0">
            <div className="w-10 h-1 rounded-full bg-border/60" />
          </div>
        )}
        {title && (
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border/30 flex-shrink-0">
            <h2 className="text-base md:text-lg font-semibold">{title}</h2>
            <button onClick={attemptClose} className="text-muted hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="px-4 md:px-6 py-4 pb-8 md:pb-4 flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {/* Close confirmation bar */}
        {showCloseConfirm && (
          <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-t border-border/30 bg-card flex-shrink-0">
            <span className="text-sm text-muted">Hai modifiche non salvate.</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                Continua
              </button>
              <button
                onClick={() => { setShowCloseConfirm(false); onClose() }}
                className="text-sm font-medium px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              >
                Chiudi senza salvare
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
