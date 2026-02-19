'use client'

import { useState, useCallback, useRef } from 'react'

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({ open: false, message: '' })
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({ ...options, open: true })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setState((s) => ({ ...s, open: false }))
    resolveRef.current?.(true)
    resolveRef.current = null
  }, [])

  const handleCancel = useCallback(() => {
    setState((s) => ({ ...s, open: false }))
    resolveRef.current?.(false)
    resolveRef.current = null
  }, [])

  return {
    confirm,
    confirmProps: {
      open: state.open,
      title: state.title,
      message: state.message,
      confirmLabel: state.confirmLabel,
      cancelLabel: state.cancelLabel,
      variant: state.variant,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  }
}
