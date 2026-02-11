'use client'

import { useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
    }
  }, [])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-border p-4 bg-card">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un messaggio..."
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-md border border-border bg-transparent px-3 py-2 text-sm',
            'placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            'min-h-[40px] max-h-[160px]'
          )}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          title="Invia messaggio"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
