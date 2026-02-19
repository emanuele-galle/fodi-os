'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Conferma',
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  variant = 'default',
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === overlayRef.current && onCancel()}
    >
      <div className="bg-card/95 backdrop-blur-xl shadow-[var(--shadow-xl)] border border-border/30 animate-scale-in rounded-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start gap-4">
          {variant === 'danger' && (
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted">{message}</p>
          </div>
          <button onClick={onCancel} className="text-muted hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'primary'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
