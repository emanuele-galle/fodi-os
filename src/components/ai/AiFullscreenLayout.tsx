'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search, Plus, MessageSquare, Trash2, ChevronLeft,
  CheckSquare, Users, Calendar, Receipt,
  BarChart3, Bot, Loader2, Send
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AiChatPanel } from './AiChatPanel'
import { AiAnimatedAvatar } from './AiAnimatedAvatar'
import GradientText from '@/components/ui/GradientText'

interface Conversation {
  id: string
  title: string | null
  updatedAt: string
  _count: { messages: number }
}

interface QuickAction {
  label: string
  subtitle: string
  icon: typeof CheckSquare
  message: string
  color: string
  bgColor: string
}

const QUICK_ACTION_GROUPS: { title: string; actions: QuickAction[] }[] = [
  {
    title: 'Task & Progetti',
    actions: [
      { label: 'Task in scadenza', subtitle: 'Verifica le scadenze', icon: CheckSquare, message: 'Quali sono i miei task in scadenza?', color: 'text-blue-400', bgColor: 'group-hover:shadow-blue-500/10' },
      { label: 'Crea task', subtitle: 'Nuovo task rapido', icon: CheckSquare, message: 'Crea un nuovo task', color: 'text-blue-400', bgColor: 'group-hover:shadow-blue-500/10' },
      { label: 'Stato progetto', subtitle: 'Overview progetto', icon: BarChart3, message: 'Mostra lo stato dei progetti attivi', color: 'text-blue-400', bgColor: 'group-hover:shadow-blue-500/10' },
    ],
  },
  {
    title: 'CRM',
    actions: [
      { label: 'Pipeline deal', subtitle: 'Trattative attive', icon: Users, message: 'Mostrami la pipeline deal', color: 'text-emerald-400', bgColor: 'group-hover:shadow-emerald-500/10' },
      { label: 'Lead recenti', subtitle: 'Ultimi contatti', icon: Users, message: 'Lead ricevuti questo mese', color: 'text-emerald-400', bgColor: 'group-hover:shadow-emerald-500/10' },
      { label: 'Cerca cliente', subtitle: 'Trova nel CRM', icon: Users, message: 'Cerca cliente', color: 'text-emerald-400', bgColor: 'group-hover:shadow-emerald-500/10' },
    ],
  },
  {
    title: 'Calendario',
    actions: [
      { label: 'Agenda di oggi', subtitle: 'Eventi del giorno', icon: Calendar, message: 'Cosa ho in calendario oggi?', color: 'text-orange-400', bgColor: 'group-hover:shadow-orange-500/10' },
      { label: 'Slot libero', subtitle: 'Trova disponibilita', icon: Calendar, message: 'Trova uno slot libero questa settimana', color: 'text-orange-400', bgColor: 'group-hover:shadow-orange-500/10' },
      { label: 'Crea evento', subtitle: 'Nuovo appuntamento', icon: Calendar, message: 'Crea un evento in calendario', color: 'text-orange-400', bgColor: 'group-hover:shadow-orange-500/10' },
    ],
  },
  {
    title: 'ERP & Finanza',
    actions: [
      { label: 'Fatturato mensile', subtitle: 'Entrate del mese', icon: Receipt, message: 'Mostra il fatturato mensile', color: 'text-violet-400', bgColor: 'group-hover:shadow-violet-500/10' },
      { label: 'Preventivi in attesa', subtitle: 'Da approvare', icon: Receipt, message: 'Preventivi in attesa di approvazione', color: 'text-violet-400', bgColor: 'group-hover:shadow-violet-500/10' },
      { label: 'Spese recenti', subtitle: 'Ultime spese', icon: Receipt, message: 'Spese registrate questo mese', color: 'text-violet-400', bgColor: 'group-hover:shadow-violet-500/10' },
    ],
  },
  {
    title: 'Riepilogo',
    actions: [
      { label: 'La mia giornata', subtitle: 'Riepilogo completo', icon: Bot, message: 'Riepilogo della mia giornata', color: 'text-pink-400', bgColor: 'group-hover:shadow-pink-500/10' },
      { label: 'Report settimanale', subtitle: 'Panoramica settimana', icon: BarChart3, message: 'Report panoramica settimanale', color: 'text-pink-400', bgColor: 'group-hover:shadow-pink-500/10' },
      { label: 'Carico team', subtitle: 'Distribuzione lavoro', icon: Users, message: 'Mostra il carico di lavoro del team', color: 'text-pink-400', bgColor: 'group-hover:shadow-pink-500/10' },
    ],
  },
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
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    const msg = input.trim()
    if (!msg) return
    setInput('')
    onAction(msg)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="ai-orb ai-orb-1" />
      <div className="ai-orb ai-orb-2" />
      <div className="ai-orb ai-orb-3" />

      {/* Floating particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="ai-particle"
          style={{
            left: `${15 + i * 10}%`,
            bottom: '20%',
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

      <div className="max-w-3xl w-full space-y-10 relative z-10">
        {/* Greeting hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Animated AI avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative inline-flex mb-6"
          >
            <AiAnimatedAvatar size="xl" />
            {/* Glow ring */}
            <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 blur-xl -z-10" />
          </motion.div>

          <h1 className="text-3xl font-bold mb-2">
            <GradientText
              colors={['#a78bfa', '#c084fc', '#818cf8', '#e879f9', '#a78bfa']}
              animationSpeed={6}
              className="text-3xl font-bold"
            >
              {getGreeting()}{userName ? `, ${userName}` : ''}!
            </GradientText>
          </h1>
          <p className="text-muted-foreground/70 text-sm max-w-md mx-auto">
            Come posso aiutarti oggi? Seleziona un&apos;azione rapida o inizia una conversazione.
          </p>
        </motion.div>

        {/* Quick action grid */}
        <div className="space-y-5">
          {QUICK_ACTION_GROUPS.map((group, gi) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + gi * 0.08 }}
            >
              <h3 className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-2 pl-1">{group.title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {group.actions.map((action, i) => (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + gi * 0.08 + i * 0.03 }}
                    onClick={() => onAction(action.message)}
                    className={cn(
                      'group flex items-start gap-3 text-left p-3.5 rounded-xl',
                      'ai-glass shadow-lg shadow-transparent',
                      'hover:shadow-xl transition-all duration-300',
                      action.bgColor,
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                      'bg-white/[0.04] group-hover:bg-white/[0.08]',
                    )}>
                      <action.icon className={cn('h-4 w-4', action.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">{action.subtitle}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative max-w-lg mx-auto w-full"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            placeholder="Scrivi un messaggio..."
            className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] focus:outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/30 text-sm placeholder:text-muted-foreground/40 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white disabled:opacity-30 hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </motion.div>

        {/* Developer badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/30"
        >
          <span>Sviluppato da</span>
          <a href="https://www.fodisrl.it" target="_blank" rel="noopener noreferrer" className="text-violet-400/40 hover:text-violet-400/70 transition-colors font-medium">Fodi S.r.l.</a>
        </motion.div>
      </div>
    </div>
  )
}
