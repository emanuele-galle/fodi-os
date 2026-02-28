'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search, Plus, MessageSquare, Trash2, ChevronLeft,
  CheckSquare, Users, Calendar, Receipt,
  BarChart3, Bot, Loader2, Send, Paperclip, Mic, X,
  FileText, Image as ImageIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AiChatPanel } from './AiChatPanel'
import { AiAnimatedAvatar } from './AiAnimatedAvatar'

interface Conversation {
  id: string
  title: string | null
  updatedAt: string
  _count: { messages: number }
}

const QUICK_PILLS: { label: string; icon: typeof CheckSquare; message: string; color: string }[] = [
  { label: 'Task', icon: CheckSquare, message: 'Quali sono i miei task in scadenza?', color: 'text-blue-400' },
  { label: 'CRM', icon: Users, message: 'Mostrami la pipeline deal e i lead recenti', color: 'text-emerald-400' },
  { label: 'Calendario', icon: Calendar, message: 'Cosa ho in calendario oggi?', color: 'text-orange-400' },
  { label: 'Finanza', icon: Receipt, message: 'Mostra il fatturato mensile e i preventivi in attesa', color: 'text-violet-400' },
]

function groupByDate(conversations: Conversation[]): { label: string; items: Conversation[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const groups: { label: string; items: Conversation[] }[] = [
    { label: 'Oggi', items: [] },
    { label: 'Ieri', items: [] },
    { label: 'Questa settimana', items: [] },
    { label: 'Precedenti', items: [] },
  ]

  for (const conv of conversations) {
    const d = new Date(conv.updatedAt)
    if (d >= today) groups[0].items.push(conv)
    else if (d >= yesterday) groups[1].items.push(conv)
    else if (d >= weekAgo) groups[2].items.push(conv)
    else groups[3].items.push(conv)
  }

  return groups.filter(g => g.items.length > 0)
}

interface AiFullscreenLayoutProps {
  userName?: string
}

export function AiFullscreenLayout({ userName }: AiFullscreenLayoutProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/conversations')
      if (res.ok) {
        const { data } = await res.json()
        setConversations(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter(c => c.title?.toLowerCase().includes(q))
  }, [conversations, search])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const handleNewConversation = () => {
    setSelectedId(null)
  }

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (selectedId === id) setSelectedId(null)
    } catch {}
  }

  return (
    <div className="flex h-full ai-mesh-bg">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r border-white/[0.06] flex flex-col bg-background/60 backdrop-blur-xl overflow-hidden"
          >
            {/* Sidebar header */}
            <div className="px-3 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Cerca conversazioni..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white/[0.03] border border-white/[0.06] focus:outline-none focus:ring-1 focus:ring-violet-500/30 focus:border-violet-500/30 transition-all placeholder:text-muted-foreground/40"
                />
              </div>
              <button
                onClick={handleNewConversation}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                title="Nuova conversazione"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto ai-scrollbar">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-400/50" />
                </div>
              ) : grouped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground/50">
                    {search ? 'Nessun risultato' : 'Nessuna conversazione'}
                  </p>
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.label}>
                    <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
                      {group.label}
                    </div>
                    {group.items.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedId(conv.id)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 flex items-center gap-2.5 transition-all group relative',
                          selectedId === conv.id
                            ? 'bg-violet-500/10 border-l-2 border-violet-500'
                            : 'border-l-2 border-transparent hover:bg-white/[0.03]',
                        )}
                      >
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                          selectedId === conv.id ? 'bg-violet-500/20' : 'bg-white/[0.04]',
                        )}>
                          <MessageSquare className={cn(
                            'h-3.5 w-3.5',
                            selectedId === conv.id ? 'text-violet-400' : 'text-muted-foreground/50',
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-xs font-medium truncate',
                            selectedId === conv.id ? 'text-violet-200' : 'text-foreground/80',
                          )}>
                            {conv.title || 'Senza titolo'}
                          </p>
                          <p className="text-[10px] text-muted-foreground/40">
                            {conv._count.messages} msg
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute top-3 left-2 z-10 p-1 rounded-lg hover:bg-muted transition-colors md:hidden"
      >
        <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
      </button>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedId ? (
          <AiChatPanel
            key={selectedId + (pendingMessage || '')}
            initialConversationId={selectedId !== 'new' ? selectedId : undefined}
            initialMessage={pendingMessage || undefined}
          />
        ) : (
          <WelcomeScreen userName={userName} onAction={(msg) => {
            setPendingMessage(msg)
            setSelectedId('new')
          }} />
        )}
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buongiorno'
  if (hour < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

function WelcomeScreen({ userName, onAction }: { userName?: string; onAction: (msg: string) => void }) {
  const [input, setInput] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const msg = input.trim()
    if (!msg) return
    setInput('')
    setPendingFiles([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    onAction(msg)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    setPendingFiles(prev => [...prev, ...Array.from(files)].slice(0, 3))
  }

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div
      className="flex-1 flex items-center justify-center p-6 relative overflow-hidden"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileSelect(e.dataTransfer.files) }}
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

      {/* Animated gradient orbs */}
      <div className="ai-orb ai-orb-1" />
      <div className="ai-orb ai-orb-2" />
      <div className="ai-orb ai-orb-3" />

      {/* Floating particles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="ai-particle"
          style={{
            left: `${20 + i * 12}%`,
            bottom: '25%',
            '--particle-x': `${(i % 2 === 0 ? 1 : -1) * (10 + i * 5)}px`,
            '--particle-duration': `${3 + i * 0.5}s`,
            '--particle-delay': `${i * 0.7}s`,
            background: i % 3 === 0
              ? 'rgba(139, 92, 246, 0.4)'
              : i % 3 === 1
                ? 'rgba(168, 85, 247, 0.3)'
                : 'rgba(99, 102, 241, 0.4)',
          } as React.CSSProperties}
        />
      ))}

      <div className="max-w-2xl w-full space-y-8 relative z-10">
        {/* Greeting - Claude style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-3xl font-light tracking-tight text-foreground/90 mb-2">
            {getGreeting()}
            {userName && (
              <span className="relative inline-block ml-1">
                <span className="font-normal">{userName}</span>
                {/* Decorative SVG underline */}
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 100 8"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path
                    d="M0 5 Q25 0 50 4 Q75 8 100 3"
                    stroke="rgba(139, 92, 246, 0.5)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
            )}
          </h1>
          <p className="text-muted-foreground/50 text-sm">
            Come posso aiutarti oggi?
          </p>
        </motion.div>

        {/* Premium input container */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="ai-fade-in-blur"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="ai-input-container rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl">
            {/* File preview cards */}
            {pendingFiles.length > 0 && (
              <div className="flex gap-2 px-4 pt-3 pb-1">
                {pendingFiles.map((file, i) => (
                  <div key={i} className="relative group">
                    {file.type.startsWith('image/') ? (
                      <div className="ai-file-card w-24 h-24 rounded-xl overflow-hidden border border-border/40">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="ai-file-card w-24 h-24 rounded-xl border border-border/40 bg-secondary/50 flex flex-col items-center justify-center gap-1 p-2">
                        <FileText className="h-5 w-5 text-muted-foreground/60" />
                        <span className="text-[9px] text-muted-foreground/70 truncate w-full text-center">{file.name}</span>
                        <span className="text-[8px] text-muted-foreground/40">{(file.size / 1024).toFixed(0)} KB</span>
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
            <div className="px-4 py-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Scrivi un messaggio..."
                rows={1}
                className="w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pendingFiles.length >= 3}
                  className="p-2 rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-30"
                  title="Allega file"
                >
                  <Plus className="h-4 w-4 text-muted-foreground/60" />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-secondary/80 transition-colors"
                  title="Messaggio vocale"
                >
                  <Mic className="h-4 w-4 text-muted-foreground/60" />
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn(
                  'p-2.5 rounded-xl transition-all duration-200',
                  input.trim()
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105 active:scale-95'
                    : 'bg-secondary/60 text-muted-foreground/30',
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

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
        </motion.div>

        {/* Quick category pills */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {QUICK_PILLS.map((pill) => (
            <button
              key={pill.label}
              onClick={() => onAction(pill.message)}
              className="group flex items-center gap-2 px-4 py-2 rounded-full border border-border/40 bg-card/50 hover:bg-card hover:border-violet-500/30 hover:shadow-md transition-all duration-200"
            >
              <pill.icon className={cn('h-3.5 w-3.5', pill.color)} />
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{pill.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Developer badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/30"
        >
          <span>Sviluppato da</span>
          <a href="https://www.fodisrl.it" target="_blank" rel="noopener noreferrer" className="text-violet-400/40 hover:text-violet-400/70 transition-colors font-medium">Fodi S.r.l.</a>
        </motion.div>
      </div>
    </div>
  )
}
