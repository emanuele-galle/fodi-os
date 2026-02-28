'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Plus, Loader2, AlertCircle, History, X, Bot, Maximize2, Minimize2, Sparkles, Paperclip, Mic, FileText, Image as ImageIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAiChat } from '@/hooks/useAiChat'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { AiMessageBubble } from './AiMessageBubble'
import { AiTypingIndicator } from './AiTypingIndicator'
import { AiSuggestions } from './AiSuggestions'
import { AiVoiceRecorder } from './AiVoiceRecorder'

interface Conversation {
  id: string
  title: string | null
  updatedAt: string
  _count: { messages: number }
}

interface AiChatPanelProps {
  compact?: boolean
  onExpand?: () => void
  onCollapse?: () => void
  initialConversationId?: string
}

const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tasks': 'Task & Progetti',
  '/projects': 'Progetti',
  '/crm': 'CRM',
  '/crm/leads': 'CRM > Lead',
  '/crm/deals': 'CRM > Pipeline Deal',
  '/crm/clients': 'CRM > Clienti',
  '/calendar': 'Calendario',
  '/erp': 'ERP & Finanza',
  '/erp/quotes': 'ERP > Preventivi',
  '/erp/expenses': 'ERP > Spese',
  '/erp/income': 'ERP > Entrate',
  '/support': 'Support > Ticket',
  '/time': 'Time Tracking',
  '/ai': 'Assistente AI',
}

function getPageLabel(pathname: string): string | undefined {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname]
  const match = Object.keys(PAGE_LABELS)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname.startsWith(key))
  return match ? PAGE_LABELS[match] : undefined
}

export function AiChatPanel({ compact = false, onExpand, onCollapse, initialConversationId }: AiChatPanelProps) {
  const pathname = usePathname()
  const currentPage = getPageLabel(pathname)
  const { messages, isLoading, error, suggestedFollowups, conversationId, sendMessage, sendMessageWithFiles, loadConversation, clearMessages } = useAiChat()
  const { isRecording, duration, startRecording, stopRecording, error: voiceError } = useVoiceRecorder()
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [transcribing, setTranscribing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const initialLoadDone = useRef(false)

  // Load initial conversation if provided
  useEffect(() => {
    if (initialConversationId && initialConversationId !== 'new' && !initialLoadDone.current) {
      initialLoadDone.current = true
      loadConversation(initialConversationId)
    }
  }, [initialConversationId, loadConversation])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }, [])

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim()
    if ((!msg && pendingFiles.length === 0) || isLoading) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'

    if (pendingFiles.length > 0) {
      const files = [...pendingFiles]
      setPendingFiles([])
      await sendMessageWithFiles(msg, files, currentPage)
    } else {
      await sendMessage(msg, currentPage)
    }
  }, [input, isLoading, sendMessage, sendMessageWithFiles, currentPage, pendingFiles])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // File handling
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 3 - pendingFiles.length)
    setPendingFiles((prev) => [...prev, ...newFiles].slice(0, 3))
  }, [pendingFiles.length])

  const removeFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  // Voice recording
  const handleVoiceStop = useCallback(async () => {
    const blob = await stopRecording()
    if (!blob) return

    setTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'audio.webm')

      const res = await fetch('/api/ai/transcribe', { method: 'POST', body: formData })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Errore trascrizione')
      }
      const { text } = await res.json()
      if (text) {
        setInput((prev) => (prev ? `${prev} ${text}` : text))
        inputRef.current?.focus()
      }
    } catch {
      // Silently fail - user can retry
    } finally {
      setTranscribing(false)
    }
  }, [stopRecording])

  const loadHistory = useCallback(async () => {
    setShowHistory(true)
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/ai/conversations')
      if (res.ok) {
        const { data } = await res.json()
        setConversations(data)
      }
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  const selectConversation = useCallback(async (id: string) => {
    setShowHistory(false)
    await loadConversation(id)
  }, [loadConversation])

  // Determine active tool name for typing indicator
  const lastMessage = messages[messages.length - 1]
  const showTyping = isLoading && lastMessage?.role === 'assistant' && !lastMessage.content
  const activeToolName = isLoading && lastMessage?.toolCalls?.length
    ? lastMessage.toolCalls.find(tc => tc.status === 'running')?.name
    : undefined

  return (
    <div
      className="flex flex-col h-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 bg-violet-500/10 border-2 border-dashed border-violet-400/40 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <div className="text-center">
            <Paperclip className="h-8 w-8 text-violet-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-violet-300">Rilascia per allegare</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/[0.06] overflow-hidden">
        {/* Header gradient background with shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.07] via-purple-500/[0.05] to-fuchsia-500/[0.03]" />
        <div className="absolute inset-0 ai-header-shimmer" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

        <div className="flex items-center gap-3 relative">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/25 to-purple-600/25 flex items-center justify-center border border-violet-400/10">
              <Bot className="h-4.5 w-4.5 text-violet-300" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-background" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Assistente AI</h2>
            </div>
            {!compact && (
              <p className="text-[10px] text-muted-foreground/50">Gestisci task, CRM, calendario e report</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 relative">
          {compact && onExpand && (
            <button
              onClick={onExpand}
              className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
              title="Espandi"
            >
              <Maximize2 className="h-4 w-4 text-muted-foreground/60" />
            </button>
          )}
          {!compact && onCollapse && (
            <button
              onClick={onCollapse}
              className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
              title="Comprimi"
            >
              <Minimize2 className="h-4 w-4 text-muted-foreground/60" />
            </button>
          )}
          <button
            onClick={loadHistory}
            className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            title="Cronologia"
          >
            <History className="h-4 w-4 text-muted-foreground/60" />
          </button>
          <button
            onClick={clearMessages}
            className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            title="Nuova conversazione"
          >
            <Plus className="h-4 w-4 text-muted-foreground/60" />
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="absolute inset-0 z-10 bg-background/95 backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold">Conversazioni</h3>
            <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-white/[0.06]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto ai-scrollbar">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-violet-400/50" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-muted-foreground/50 text-sm py-8">Nessuna conversazione</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className="w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04]"
                >
                  <p className="text-sm font-medium truncate">{c.title || 'Conversazione senza titolo'}</p>
                  <p className="text-xs text-muted-foreground/50 mt-0.5">
                    {c._count.messages} messaggi &middot; {new Date(c.updatedAt).toLocaleDateString('it-IT')}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 ai-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center border border-violet-400/10">
                <Bot className="h-7 w-7 text-violet-300" />
              </div>
              <div className="absolute -inset-2 rounded-2xl bg-violet-500/10 blur-xl -z-10" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Come posso aiutarti?</p>
              <p className="text-xs text-muted-foreground/50 max-w-[280px]">
                Posso gestire task, cercare clienti, controllare il calendario, generare report e molto altro.
              </p>
            </div>
            <AiSuggestions onSelect={(s) => handleSend(s)} variant="empty" currentPage={currentPage} />
          </div>
        )}

        {messages.map((msg) => (
          <AiMessageBubble key={msg.id} message={msg} />
        ))}

        {showTyping && <AiTypingIndicator activeToolName={activeToolName} />}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {voiceError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{voiceError}</span>
          </div>
        )}

        {/* Follow-up suggestions after response */}
        {!isLoading && suggestedFollowups.length > 0 && messages.length > 0 && (
          <AiSuggestions
            suggestions={suggestedFollowups}
            onSelect={(s) => handleSend(s)}
            variant="followup"
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        {/* File preview area */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs">
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="h-3.5 w-3.5 text-violet-400" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-violet-400" />
                )}
                <span className="truncate max-w-[120px] text-muted-foreground">{file.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="p-0.5 rounded hover:bg-white/[0.08] text-muted-foreground/60 hover:text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Voice recording UI */}
        {isRecording ? (
          <AiVoiceRecorder duration={duration} onStop={handleVoiceStop} />
        ) : transcribing ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
            <span className="text-sm text-muted-foreground">Trascrizione in corso...</span>
          </div>
        ) : (
          <div className="flex items-end gap-2 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl px-4 py-2.5 ai-input-glow">
            {/* Attach + mic buttons */}
            <div className="flex items-center gap-0.5 flex-shrink-0 pb-0.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || pendingFiles.length >= 3}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-30"
                title="Allega file"
              >
                <Paperclip className="h-4 w-4 text-muted-foreground/50" />
              </button>
              <button
                onClick={startRecording}
                disabled={isLoading}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors disabled:opacity-30"
                title="Messaggio vocale"
              >
                <Mic className="h-4 w-4 text-muted-foreground/50" />
              </button>
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi un messaggio..."
              rows={1}
              disabled={isLoading}
              className={cn(
                'flex-1 resize-none bg-transparent text-sm leading-relaxed',
                'placeholder:text-muted-foreground/40 focus:outline-none',
                'disabled:opacity-50',
              )}
            />
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && pendingFiles.length === 0) || isLoading}
              className={cn(
                'flex-shrink-0 p-2.5 rounded-xl transition-all duration-200',
                (input.trim() || pendingFiles.length > 0) && !isLoading
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105 active:scale-95'
                  : 'bg-white/[0.04] text-muted-foreground/30',
              )}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          className="hidden"
          onChange={(e) => {
            handleFileSelect(e.target.files)
            e.target.value = ''
          }}
        />

        {!compact && !isRecording && !transcribing && (
          <div className="flex items-center justify-center gap-1 mt-1.5 text-[9px] text-muted-foreground/25">
            <Sparkles className="h-2.5 w-2.5" />
            <span>AI puo fare errori. Verifica le informazioni importanti.</span>
          </div>
        )}
      </div>
    </div>
  )
}
