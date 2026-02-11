'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Smile, Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const EMOJI_LIST = [
  '😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎',
  '🤔', '😅', '😢', '😭', '😤', '🤯', '🥳', '😴',
  '👍', '👎', '👏', '🙌', '🤝', '💪', '🎉', '🔥',
  '❤️', '💯', '⭐', '✅', '❌', '⚡', '🚀', '💡',
  '📎', '📌', '🎯', '💬', '👀', '🙏', '😱', '🤷',
]

interface ReplyTo {
  id: string
  content: string
  authorName: string
}

interface MessageInputProps {
  onSend: (content: string) => void
  onSendFile?: (file: File) => void
  onTyping?: () => void
  replyTo?: ReplyTo | null
  onCancelReply?: () => void
  disabled?: boolean
}

export function MessageInput({ onSend, onSendFile, onTyping, replyTo, onCancelReply, disabled }: MessageInputProps) {
  const [value, setValue] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>(null)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
    }
  }, [])

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiOpen) return
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [emojiOpen])

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    onCancelReply?.()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function insertEmoji(emoji: string) {
    setValue((prev) => prev + emoji)
    setEmojiOpen(false)
    textareaRef.current?.focus()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && onSendFile) {
      onSendFile(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const hasContent = value.trim().length > 0

  return (
    <div className="p-3 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-4 bg-card/80 backdrop-blur-sm border-t border-border/50">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 max-w-4xl mx-auto">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-secondary/60 rounded-lg border-l-2 border-primary">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-primary">{replyTo.authorName}</span>
              <p className="text-[12px] text-muted-foreground/70 truncate">{replyTo.content}</p>
            </div>
            <button onClick={onCancelReply} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors flex-shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        {onSendFile && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="h-[42px] w-[42px] rounded-xl flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/60 transition-all flex-shrink-0"
              title="Allega file"
            >
              <Paperclip className="h-4.5 w-4.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              adjustHeight()
              if (onTyping) {
                if (typingTimeout.current) clearTimeout(typingTimeout.current)
                onTyping()
                typingTimeout.current = setTimeout(() => { typingTimeout.current = null }, 2000)
              }
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
          <div className="absolute right-3 bottom-2.5" ref={emojiRef}>
            <button
              type="button"
              onClick={() => setEmojiOpen(!emojiOpen)}
              className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
            >
              <Smile className="h-4.5 w-4.5" />
            </button>
            {emojiOpen && (
              <div className="absolute bottom-8 right-0 z-50 bg-card border border-border/60 rounded-xl shadow-lg p-2 w-[280px]">
                <div className="grid grid-cols-8 gap-0.5">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary/80 transition-colors text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
