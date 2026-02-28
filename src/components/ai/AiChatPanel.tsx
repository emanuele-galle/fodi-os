'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Plus, Loader2, AlertCircle, History, X, Maximize2, Minimize2, Paperclip, Mic, FileText, Image as ImageIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAiChat } from '@/hooks/useAiChat'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { useVoiceSynthesis } from '@/hooks/useVoiceSynthesis'
import { AiMessageBubble } from './AiMessageBubble'
import { AiTypingIndicator } from './AiTypingIndicator'
import { AiSuggestions } from './AiSuggestions'
import { AiVoiceRecorder } from './AiVoiceRecorder'
import { AiVoiceToggle } from './AiVoiceToggle'
import { AiAnimatedAvatar } from './AiAnimatedAvatar'

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
  initialMessage?: string
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

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export function AiChatPanel({ compact = false, onExpand, onCollapse, initialConversationId, initialMessage }: AiChatPanelProps) {
  const pathname = usePathname()
  const currentPage = getPageLabel(pathname)
  const { messages, isLoading, error, suggestedFollowups, conversationId, sendMessage, sendMessageWithFiles, loadConversation, clearMessages } = useAiChat()
  const { isRecording, duration, startRecording, stopRecording, error: voiceError } = useVoiceRecorder()
  const { isPlaying, config: voiceConfig, speak, stop: stopSpeaking, loadConfig: loadVoiceConfig } = useVoiceSynthesis()
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const lastSpokenMessageRef = useRef<string | null>(null)
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

  // Load voice config
  useEffect(() => {
    loadVoiceConfig()
  }, [loadVoiceConfig])

  // Set auto-play from config
  useEffect(() => {
    if (voiceConfig?.autoPlay) {
      setVoiceEnabled(true)
    }
  }, [voiceConfig?.autoPlay])

  // Auto-play voice for new assistant messages when voice is enabled
  useEffect(() => {
    if (!voiceEnabled || !voiceConfig || voiceConfig.provider === 'disabled') return
    if (isLoading) return

    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role === 'assistant' && lastMsg.content && lastMsg.id !== lastSpokenMessageRef.current) {
      lastSpokenMessageRef.current = lastMsg.id
      speak(lastMsg.content, lastMsg.id)
    }
  }, [messages, isLoading, voiceEnabled, voiceConfig, speak])

  // Load initial conversation if provided
  useEffect(() => {
    if (initialConversationId && initialConversationId !== 'new' && !initialLoadDone.current) {
      initialLoadDone.current = true
      loadConversation(initialConversationId)
    }
  }, [initialConversationId, loadConversation])

  // Send initial message if provided (from quick actions)
  const initialMessageSent = useRef(false)
  useEffect(() => {
    if (initialMessage && !initialMessageSent.current) {
      initialMessageSent.current = true
      sendMessage(initialMessage, currentPage)
    }
  }, [initialMessage, sendMessage, currentPage])

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
    } catch (err) {
      console.error('Transcription error:', err)
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
      className="flex flex-col h-full relative"
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
          <AiAnimatedAvatar size="md" />
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
          {voiceConfig && voiceConfig.provider !== 'disabled' && (
            <AiVoiceToggle
              enabled={voiceEnabled}
              onToggle={() => {
                if (voiceEnabled) stopSpeaking()
                setVoiceEnabled(!voiceEnabled)
              }}
            />
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
              <AiAnimatedAvatar size="lg" />
              <div className="absolute -inset-3 rounded-2xl bg-violet-500/10 blur-xl -z-10" />
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
          <AiMessageBubble
            key={msg.id}
            message={msg}
            onSpeak={voiceConfig && voiceConfig.provider !== 'disabled' ? speak : undefined}
            isSpeaking={isPlaying}
          />
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
      <div className="px-3 py-3 border-t border-white/[0.06]">
        {/* Voice recording UI */}
        {isRecording ? (
          <AiVoiceRecorder duration={duration} onStop={handleVoiceStop} />
        ) : transcribing ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
            <span className="text-sm text-muted-foreground">Trascrizione in corso...</span>
          </div>
        ) : (
          <div className="ai-input-container rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl">
            {/* File preview cards */}
            {pendingFiles.length > 0 && (
              <div className="flex gap-2 px-3 pt-3 pb-1">
                {pendingFiles.map((file, i) => (
                  <div key={i} className="relative group">
                    {file.type.startsWith('image/') ? (
                      <div className="ai-file-card w-20 h-20 rounded-xl overflow-hidden border border-border/40">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="ai-file-card w-20 h-20 rounded-xl border border-border/40 bg-secondary/50 flex flex-col items-center justify-center gap-1 p-2">
                        <FileText className="h-4 w-4 text-muted-foreground/60" />
                        <span className="text-[8px] text-muted-foreground/70 truncate w-full text-center">{file.name}</span>
                        <span className="text-[7px] text-muted-foreground/40">{(file.size / 1024).toFixed(0)} KB</span>
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-foreground/80 text-background opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Textarea */}
            <div className="px-3 py-2.5">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Scrivi un messaggio..."
                rows={1}
                disabled={isLoading}
                className={cn(
                  'w-full resize-none bg-transparent text-sm leading-relaxed',
                  'placeholder:text-muted-foreground/40 focus:outline-none',
                  'disabled:opacity-50',
                )}
              />
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between px-2.5 pb-2.5">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || pendingFiles.length >= 3}
                  className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-30"
                  title="Allega file"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground/50" />
                </button>
                <button
                  onClick={startRecording}
                  disabled={isLoading}
                  className="p-1.5 rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-30"
                  title="Messaggio vocale"
                >
                  <Mic className="h-4 w-4 text-muted-foreground/50" />
                </button>
              </div>
              <button
                onClick={() => handleSend()}
                disabled={(!input.trim() && pendingFiles.length === 0) || isLoading}
                className={cn(
                  'p-2.5 rounded-xl transition-all duration-200',
                  (input.trim() || pendingFiles.length > 0) && !isLoading
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105 active:scale-95'
                    : 'bg-secondary/60 text-muted-foreground/30',
                )}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
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
          <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[9px] text-muted-foreground/25">
            <span>Sviluppato da</span>
            <a href="https://www.fodisrl.it" target="_blank" rel="noopener noreferrer" className="text-violet-400/40 hover:text-violet-400/70 transition-colors font-medium">Fodi S.r.l.</a>
          </div>
        )}
      </div>
    </div>
  )
}
