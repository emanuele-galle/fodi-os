'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- event handlers */

import { cn } from '@/lib/utils'
import { useEffect, useRef, useCallback, useState } from 'react'
import { X } from 'lucide-react'
import { BottomSheet } from './BottomSheet'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  preventAccidentalClose?: boolean
  /** Force desktop dialog even on mobile (default false) */
  forceDialog?: boolean
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

export function Modal({ open, onClose, title, children, className, size = 'md', preventAccidentalClose = false, forceDialog = false }: ModalProps) {
  const isMobile = useIsMobile()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const attemptClose = useCallback(() => {
    if (preventAccidentalClose) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }, [preventAccidentalClose, onClose])

  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') attemptClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
      document.body.classList.remove('modal-open')
      setShowCloseConfirm(false)
    }
  }, [open, attemptClose])

  if (!open) return null

  // Mobile: use BottomSheet for better UX
  if (isMobile && !forceDialog && !preventAccidentalClose) {
    return (
      <BottomSheet open={open} onClose={onClose} title={title} className={className}>
        {children}
      </BottomSheet>
    )
  }

  // Desktop: centered dialog
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-stretch md:items-center justify-center bg-black/40 animate-fade-in"
      onClick={(e) => e.target === overlayRef.current && attemptClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={cn(
          'bg-card shadow-[var(--shadow-xl)] border border-border/30 animate-scale-in flex flex-col',
          // Mobile fallback (forceDialog or preventAccidentalClose): full-screen
          'w-full h-[100dvh] rounded-none',
          // Desktop: centered dialog
          'md:h-auto md:max-h-[85vh] md:rounded-2xl',
          {
            'md:max-w-sm': size === 'sm',
            'md:max-w-md': size === 'md',
            'md:max-w-lg': size === 'lg',
            'md:max-w-2xl': size === 'xl',
          },
          className
        )}
      >
        {/* Swipe indicator on mobile when in fullscreen mode */}
        {!preventAccidentalClose && (
          <div className="md:hidden flex justify-center pt-2 pb-0">
            <div className="w-10 h-1 rounded-full bg-border/60" />
          </div>
        )}
        {title && (
          <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border/30 flex-shrink-0">
            <h2 id="modal-title" className="text-base md:text-lg font-semibold">{title}</h2>
            <button onClick={attemptClose} aria-label="Chiudi" className="text-muted hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="px-4 md:px-6 py-4 pb-8 md:pb-4 flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {/* Close confirmation bar */}
        {showCloseConfirm && (
          <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-t border-border/30 bg-card flex-shrink-0">
            <span className="text-sm text-foreground/70">Hai modifiche non salvate.</span>
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
