'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Plus, Loader2, AlertCircle, History, X, Bot, Maximize2, Minimize2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAiChat } from '@/hooks/useAiChat'
import { AiMessageBubble } from './AiMessageBubble'
import { AiTypingIndicator } from './AiTypingIndicator'
import { AiSuggestions } from './AiSuggestions'

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
  const { messages, isLoading, error, suggestedFollowups, conversationId, sendMessage, loadConversation, clearMessages } = useAiChat()
  const [input, setInput] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
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
    if (!msg || isLoading) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await sendMessage(msg, currentPage)
  }, [input, isLoading, sendMessage, currentPage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Assistente AI</h2>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            {!compact && (
              <p className="text-xs text-muted-foreground">Gestisci task, CRM, calendario e report</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {compact && onExpand && (
            <button
              onClick={onExpand}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Espandi"
            >
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {!compact && onCollapse && (
            <button
              onClick={onCollapse}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              title="Comprimi"
            >
              <Minimize2 className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={loadHistory}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Cronologia"
          >
            <History className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={clearMessages}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Nuova conversazione"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="absolute inset-0 z-10 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Conversazioni</h3>
            <button onClick={() => setShowHistory(false)} className="p-1 rounded-lg hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Nessuna conversazione</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border/50"
                >
                  <p className="text-sm font-medium truncate">{c.title || 'Conversazione senza titolo'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c._count.messages} messaggi &middot; {new Date(c.updatedAt).toLocaleDateString('it-IT')}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div>
              <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-3 mx-auto">
                <Bot className="h-6 w-6 text-violet-400" />
              </div>
              <p className="text-sm font-medium mb-1">Come posso aiutarti?</p>
              <p className="text-xs text-muted-foreground max-w-[280px]">
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
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
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-end gap-2 bg-background/60 backdrop-blur-xl border border-white/10 rounded-2xl px-3 py-2 shadow-lg shadow-violet-500/5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Scrivi un messaggio..."
            rows={1}
            disabled={isLoading}
            className={cn(
              'flex-1 resize-none bg-transparent text-sm',
              'placeholder:text-muted-foreground focus:outline-none',
              'disabled:opacity-50',
            )}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={cn(
              'flex-shrink-0 p-2 rounded-xl transition-colors',
              input.trim() && !isLoading
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
