'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { addHour } from './utils'

interface QuickEventInputProps {
  hour: number
  onSubmit: (title: string) => void
  onExpand: () => void
  onCancel: () => void
}

export function QuickEventInput({ hour, onSubmit, onExpand, onCancel }: QuickEventInputProps) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault()
      onSubmit(title.trim())
    } else if (e.key === 'Tab') {
      e.preventDefault()
      onExpand()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }, [title, onSubmit, onExpand, onCancel])

  const timeStr = `${String(hour).padStart(2, '0')}:00`

  return (
    <div className="absolute left-14 right-2 bg-primary/10 border border-primary/30 rounded-md px-2 py-1 z-30 shadow-md">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={handleTitleChange}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder="Titolo evento (Enter per creare, Tab per dettagli)"
        className="w-full text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted"
      />
      <div className="text-[10px] text-muted mt-0.5">{timeStr} — {addHour(timeStr)}</div>
    </div>
  )
}
