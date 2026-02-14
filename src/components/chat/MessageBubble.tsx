'use client'

import Image from 'next/image'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/utils'
import { CheckCheck, FileText, Edit2, Trash2, MoreHorizontal, Reply, SmilePlus, Video } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '😢']

interface MessageReaction {
  emoji: string
  count: number
  userIds: string[]
}

function parseReactions(metadata?: Record<string, unknown> | null): MessageReaction[] {
  const reactions = metadata?.reactions as Record<string, string[]> | undefined
  if (!reactions) return []
  return Object.entries(reactions).map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    userIds,
  }))
}

interface MessageBubbleProps {
  message: {
    id: string
    content: string
    createdAt: string
    type: string
    editedAt?: string | null
    deletedAt?: string | null
    metadata?: Record<string, unknown> | null
    author: {
      id: string
      firstName: string
      lastName: string
      avatarUrl?: string | null
    }
  }
  isOwn: boolean
  currentUserId?: string
  onEdit?: (messageId: string, newContent: string) => void
  onDelete?: (messageId: string) => void
  onReply?: (message: { id: string; content: string; authorName: string }) => void
  onReact?: (messageId: string, emoji: string) => void
}

// Simple rich text parser: **bold**, *italic*, `code`, URLs
function renderRichText(text: string, isOwn: boolean) {
  const parts: React.ReactNode[] = []
  // Split by code blocks first
  const segments = text.split(/(`[^`]+`)/)
  let key = 0

  for (const segment of segments) {
    if (segment.startsWith('`') && segment.endsWith('`')) {
      parts.push(
        <code key={key++} className={cn(
          'px-1.5 py-0.5 rounded text-xs font-mono',
          isOwn ? 'bg-white/20' : 'bg-secondary'
        )}>
          {segment.slice(1, -1)}
        </code>
      )
      continue
    }

    // Process bold, italic, and URLs
    const tokens = segment.split(/(\*\*[^*]+\*\*|\*[^*]+\*|https?:\/\/[^\s]+)/g)
    for (const token of tokens) {
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
      } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
        parts.push(<em key={key++}>{token.slice(1, -1)}</em>)
      } else if (/^https?:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(token)) {
        // Google Meet link - render as interactive card
        const meetUrl = token.match(/https?:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i)?.[0] || token
        parts.push(
          <span key={key++} className="block mt-1.5">
            <span className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 bg-card max-w-[280px]">
              <span className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Video className="h-4.5 w-4.5 text-emerald-600" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-foreground">Google Meet</span>
                <span className="block text-[10px] text-muted-foreground/60 truncate">{meetUrl.replace('https://', '')}</span>
              </span>
            </span>
            <button
              onClick={() => window.open(meetUrl, '_blank', 'noopener,noreferrer')}
              className="mt-1.5 w-full max-w-[280px] inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
            >
              <Video className="h-3.5 w-3.5" />
              Partecipa al meeting
            </button>
          </span>
        )
      } else if (/^https?:\/\//.test(token)) {
        parts.push(
          <a
            key={key++}
            href={token}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'underline underline-offset-2 break-all',
              isOwn ? 'text-primary-foreground/90 hover:text-primary-foreground' : 'text-primary hover:text-primary/80'
            )}
          >
            {token}
          </a>
        )
      } else if (token) {
        parts.push(token)
      }
    }
  }

  return parts
}

export function MessageBubble({ message, isOwn, currentUserId, onEdit, onDelete, onReply, onReact }: MessageBubbleProps) {
  const authorName = `${message.author.firstName} ${message.author.lastName}`
  const time = new Date(message.createdAt).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.content)
  const [showReactions, setShowReactions] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)
  const reactionRef = useRef<HTMLDivElement>(null)
  const reactions = parseReactions(message.metadata)
  const meta = message.metadata as Record<string, unknown> | null

  useEffect(() => {
    if (!menuOpen && !showReactions) return
    function handleClick(e: MouseEvent) {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (showReactions && reactionRef.current && !reactionRef.current.contains(e.target as Node)) {
        setShowReactions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen, showReactions])

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length)
    }
  }, [editing])

  function handleEditSubmit() {
    const trimmed = editText.trim()
    if (trimmed && trimmed !== message.content && onEdit) {
      onEdit(message.id, trimmed)
    }
    setEditing(false)
  }

  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center py-3">
        <span className="text-[11px] text-muted-foreground/60 bg-secondary/50 px-4 py-1.5 rounded-full font-medium">
          {message.content}
        </span>
      </div>
    )
  }

  // FILE_LINK messages
  if (message.type === 'FILE_LINK') {
    const fileMeta = message.metadata as { fileName?: string; fileUrl?: string; mimeType?: string; fileSize?: number; reactions?: Record<string, string[]> } | null
    const isImage = fileMeta?.mimeType?.startsWith('image/')
    const fileReactions = parseReactions(message.metadata)
    return (
      <div className={cn(
        'flex gap-3 px-4 md:px-6 py-1 group hover:bg-secondary/30 transition-colors duration-100',
        isOwn && 'flex-row-reverse'
      )}>
        {!isOwn ? (
          <Avatar src={message.author.avatarUrl} name={authorName} size="sm" className="flex-shrink-0 mt-0.5 ring-1 ring-border/50" />
        ) : (
          <div className="w-8 flex-shrink-0" />
        )}
        <div className={cn('max-w-[85%] md:max-w-[75%] min-w-0', isOwn && 'flex flex-col items-end')}>
          <div className={cn('flex items-baseline gap-2 mb-0.5', isOwn && 'flex-row-reverse')}>
            {!isOwn && <span className="text-[12px] font-semibold text-foreground/80">{authorName}</span>}
            <span className="text-[10px] text-muted-foreground/40 font-medium">{time}</span>
          </div>
          <div className="relative">
            <div className={cn(
              'rounded-2xl overflow-hidden shadow-sm',
              isOwn ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-card border border-border/60 text-foreground rounded-bl-md'
            )}>
              {isImage && fileMeta?.fileUrl ? (
                <a href={fileMeta.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Image src={fileMeta.fileUrl} alt={fileMeta.fileName || 'Image'} width={300} height={200} className="max-w-[300px] max-h-[200px] object-cover" unoptimized />
                </a>
              ) : (
                <a
                  href={fileMeta?.fileUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <FileText className="h-5 w-5 flex-shrink-0 opacity-70" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{fileMeta?.fileName || message.content}</p>
                    {fileMeta?.fileSize && (
                      <p className="text-xs opacity-60">{(fileMeta.fileSize / 1024).toFixed(0)} KB</p>
                    )}
                  </div>
                </a>
              )}
            </div>
            {/* Hover buttons for file messages */}
            <div className={cn(
              'absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-card border border-border/60 rounded-lg shadow-md p-0.5 z-10',
              isOwn ? 'left-0' : 'right-0'
            )}>
              {onReact && (
                <button
                  onClick={() => onReact(message.id, '👍')}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-secondary/80 transition-colors text-muted-foreground/60 hover:text-muted-foreground"
                  title="Reagisci"
                >
                  <SmilePlus className="h-3.5 w-3.5" />
                </button>
              )}
              {onReply && (
                <button
                  onClick={() => onReply({ id: message.id, content: fileMeta?.fileName || message.content, authorName })}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-secondary/80 transition-colors text-muted-foreground/60 hover:text-muted-foreground"
                  title="Rispondi"
                >
                  <Reply className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {/* Reactions for file messages */}
          {fileReactions.length > 0 && (
            <div className={cn('flex flex-wrap gap-1 mt-1', isOwn && 'justify-end')}>
              {fileReactions.map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => onReact?.(message.id, r.emoji)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
                    currentUserId && r.userIds.includes(currentUserId)
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-secondary/60 border-border/30 text-muted-foreground hover:bg-secondary'
                  )}
                >
                  <span>{r.emoji}</span>
                  <span className="font-medium">{r.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex gap-3 px-4 md:px-6 py-1 group hover:bg-secondary/30 transition-colors duration-100',
      isOwn && 'flex-row-reverse'
    )}>
      {!isOwn ? (
        <Avatar
          src={message.author.avatarUrl}
          name={authorName}
          size="sm"
          className="flex-shrink-0 mt-0.5 ring-1 ring-border/50"
        />
      ) : (
        <div className="w-8 flex-shrink-0" />
      )}
      <div className={cn('max-w-[85%] md:max-w-[75%] min-w-0', isOwn && 'flex flex-col items-end')}>
        <div className={cn('flex items-baseline gap-2 mb-0.5', isOwn && 'flex-row-reverse')}>
          {!isOwn && (
            <span className="text-[12px] font-semibold text-foreground/80">
              {authorName}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/40 font-medium">
            {time}
          </span>
          {message.editedAt && (
            <span className="text-[10px] text-muted-foreground/30 italic">(modificato)</span>
          )}
        </div>
        {/* Reply quote */}
        {typeof meta?.replyToContent === 'string' && meta.replyToContent && (
          <div className={cn(
            'mb-1 px-3 py-1.5 rounded-lg border-l-2 border-primary/40 text-[12px] max-w-full',
            isOwn ? 'bg-primary/5' : 'bg-secondary/60'
          )}>
            <span className="font-semibold block text-[11px] text-primary/70">
              {meta.replyToAuthor as string}
            </span>
            <span className="truncate block text-muted-foreground/60">
              {(meta.replyToContent as string).slice(0, 100)}
            </span>
          </div>
        )}

        <div className="relative">
          {editing ? (
            <div className="flex flex-col gap-1">
              <textarea
                ref={editRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleEditSubmit()
                  }
                  if (e.key === 'Escape') setEditing(false)
                }}
                className="w-full min-w-[200px] rounded-lg bg-secondary/60 px-3 py-2 text-sm border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={2}
              />
              <div className="flex gap-1 text-[10px]">
                <button onClick={handleEditSubmit} className="text-primary hover:underline">Salva</button>
                <span className="text-muted-foreground/40">|</span>
                <button onClick={() => setEditing(false)} className="text-muted-foreground/60 hover:underline">Annulla</button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words shadow-sm',
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-card border border-border/60 text-foreground rounded-bl-md'
              )}
            >
              <p className="whitespace-pre-wrap">{renderRichText(message.content, isOwn)}</p>
            </div>
          )}

          {/* Hover action buttons (react, reply, menu) */}
          {!editing && (
            <div className={cn(
              'absolute -top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-card border border-border/60 rounded-lg shadow-md p-0.5 z-10',
              isOwn ? 'left-0' : 'right-0'
            )}>
              {/* React button */}
              {onReact && (
                <div className="relative" ref={reactionRef}>
                  <button
                    onClick={() => setShowReactions(!showReactions)}
                    className="h-9 w-9 md:h-7 md:w-7 flex items-center justify-center rounded-md hover:bg-secondary/80 transition-colors text-muted-foreground/60 hover:text-muted-foreground touch-manipulation"
                    title="Reagisci"
                  >
                    <SmilePlus className="h-4 w-4 md:h-3.5 md:w-3.5" />
                  </button>
                  {showReactions && (
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-card border border-border/60 rounded-lg shadow-lg p-1.5 flex gap-0.5 z-20">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => { onReact(message.id, emoji); setShowReactions(false) }}
                          className="h-9 w-9 md:h-7 md:w-7 flex items-center justify-center rounded-md hover:bg-secondary/80 transition-colors text-lg touch-manipulation"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Reply button */}
              {onReply && (
                <button
                  onClick={() => onReply({ id: message.id, content: message.content, authorName })}
                  className="h-9 w-9 md:h-7 md:w-7 flex items-center justify-center rounded-md hover:bg-secondary/80 transition-colors text-muted-foreground/60 hover:text-muted-foreground touch-manipulation"
                  title="Rispondi"
                >
                  <Reply className="h-4 w-4 md:h-3.5 md:w-3.5" />
                </button>
              )}
              {/* Own message menu (edit/delete) */}
              {isOwn && (onEdit || onDelete) && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="h-9 w-9 md:h-7 md:w-7 flex items-center justify-center rounded-md hover:bg-secondary/80 transition-colors text-muted-foreground/60 hover:text-muted-foreground touch-manipulation"
                    title="Altro"
                  >
                    <MoreHorizontal className="h-4 w-4 md:h-3.5 md:w-3.5" />
                  </button>
                  {menuOpen && (
                    <div className="absolute top-full mt-1 right-0 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                      {onEdit && (
                        <button
                          onClick={() => { setEditing(true); setEditText(message.content); setMenuOpen(false) }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 md:py-1.5 text-sm hover:bg-secondary/60 transition-colors text-left touch-manipulation"
                        >
                          <Edit2 className="h-4 w-4 md:h-3.5 md:w-3.5" /> Modifica
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => { onDelete(message.id); setMenuOpen(false) }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 md:py-1.5 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left touch-manipulation"
                        >
                          <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" /> Elimina
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reactions display */}
        {reactions.length > 0 && (
          <div className={cn('flex flex-wrap gap-1 mt-1', isOwn && 'justify-end')}>
            {reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => onReact?.(message.id, r.emoji)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
                  currentUserId && r.userIds.includes(currentUserId)
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-secondary/60 border-border/30 text-muted-foreground hover:bg-secondary'
                )}
              >
                <span>{r.emoji}</span>
                <span className="font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {isOwn && !editing && (
          <div className="flex items-center gap-1 mt-0.5 pr-1">
            <CheckCheck className="h-3 w-3 text-primary/60" />
          </div>
        )}
      </div>
    </div>
  )
}
