'use client'

import { useState, useRef, useCallback } from 'react'
import { Send, Smile } from 'lucide-react'
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

  const hasContent = value.trim().length > 0

  return (
    <div className="p-3 md:p-4 bg-card/80 backdrop-blur-sm border-t border-border/50">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
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
              'w-full resize-none rounded-xl bg-secondary/60 px-4 py-2.5 pr-10 text-sm',
              'border border-border/30 hover:border-border/60',
              'placeholder:text-muted-foreground/40',
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-background',
              'min-h-[42px] max-h-[160px] transition-all duration-200'
            )}
          />
          <button
            type="button"
            className="absolute right-3 bottom-2.5 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
          >
            <Smile className="h-4.5 w-4.5" />
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled || !hasContent}
          className={cn(
            'h-[42px] w-[42px] rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0',
            hasContent && !disabled
              ? 'bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
              : 'bg-secondary/60 text-muted-foreground/30 cursor-not-allowed'
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
