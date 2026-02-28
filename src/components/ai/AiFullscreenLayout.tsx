'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search, Plus, MessageSquare, Trash2, ChevronLeft,
  CheckSquare, Users, Calendar, Receipt,
  BarChart3, Bot, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AiChatPanel } from './AiChatPanel'

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
}

const QUICK_ACTION_GROUPS: { title: string; actions: QuickAction[] }[] = [
  {
    title: 'Task & Progetti',
    actions: [
      { label: 'Task in scadenza', subtitle: 'Verifica le scadenze', icon: CheckSquare, message: 'Quali sono i miei task in scadenza?', color: 'text-blue-400' },
      { label: 'Crea task', subtitle: 'Nuovo task rapido', icon: CheckSquare, message: 'Crea un nuovo task', color: 'text-blue-400' },
      { label: 'Stato progetto', subtitle: 'Overview progetto', icon: BarChart3, message: 'Mostra lo stato dei progetti attivi', color: 'text-blue-400' },
    ],
  },
  {
    title: 'CRM',
    actions: [
      { label: 'Pipeline deal', subtitle: 'Trattative attive', icon: Users, message: 'Mostrami la pipeline deal', color: 'text-emerald-400' },
      { label: 'Lead recenti', subtitle: 'Ultimi contatti', icon: Users, message: 'Lead ricevuti questo mese', color: 'text-emerald-400' },
      { label: 'Cerca cliente', subtitle: 'Trova nel CRM', icon: Users, message: 'Cerca cliente', color: 'text-emerald-400' },
    ],
  },
  {
    title: 'Calendario',
    actions: [
      { label: 'Agenda di oggi', subtitle: 'Eventi del giorno', icon: Calendar, message: 'Cosa ho in calendario oggi?', color: 'text-orange-400' },
      { label: 'Slot libero', subtitle: 'Trova disponibilità', icon: Calendar, message: 'Trova uno slot libero questa settimana', color: 'text-orange-400' },
      { label: 'Crea evento', subtitle: 'Nuovo appuntamento', icon: Calendar, message: 'Crea un evento in calendario', color: 'text-orange-400' },
    ],
  },
  {
    title: 'ERP & Finanza',
    actions: [
      { label: 'Fatturato mensile', subtitle: 'Entrate del mese', icon: Receipt, message: 'Mostra il fatturato mensile', color: 'text-violet-400' },
      { label: 'Preventivi in attesa', subtitle: 'Da approvare', icon: Receipt, message: 'Preventivi in attesa di approvazione', color: 'text-violet-400' },
      { label: 'Spese recenti', subtitle: 'Ultime spese', icon: Receipt, message: 'Spese registrate questo mese', color: 'text-violet-400' },
    ],
  },
  {
    title: 'Riepilogo',
    actions: [
      { label: 'La mia giornata', subtitle: 'Riepilogo completo', icon: Bot, message: 'Riepilogo della mia giornata', color: 'text-pink-400' },
      { label: 'Report settimanale', subtitle: 'Panoramica settimana', icon: BarChart3, message: 'Report panoramica settimanale', color: 'text-pink-400' },
      { label: 'Carico team', subtitle: 'Distribuzione lavoro', icon: Users, message: 'Mostra il carico di lavoro del team', color: 'text-pink-400' },
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

export function AiFullscreenLayout() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
    <div className="flex h-full">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r border-border flex flex-col bg-muted/30 overflow-hidden"
          >
            {/* Sidebar header */}
            <div className="px-3 py-3 border-b border-border flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cerca conversazioni..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-background border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <button
                onClick={handleNewConversation}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title="Nuova conversazione"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : grouped.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs py-8">
                  {search ? 'Nessun risultato' : 'Nessuna conversazione'}
                </p>
              ) : (
                grouped.map((group) => (
                  <div key={group.label}>
                    <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </div>
                    {group.items.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedId(conv.id)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-muted/60 transition-all group',
                          selectedId === conv.id
                            ? 'bg-violet-500/10 border-l-2 border-violet-500'
                            : 'border-l-2 border-transparent',
                        )}
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{conv.title || 'Senza titolo'}</p>
                          <p className="text-[10px] text-muted-foreground">
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
          <AiChatPanel key={selectedId} initialConversationId={selectedId} />
        ) : (
          <WelcomeScreen onAction={(msg) => {
            setSelectedId('new')
          }} />
        )}
      </div>
    </div>
  )
}

function WelcomeScreen({ onAction }: { onAction: (msg: string) => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full space-y-8">
        {/* Greeting */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-violet-500/20">
            <Bot className="h-10 w-10 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Buongiorno!</h1>
          <p className="text-muted-foreground text-sm">Come posso aiutarti oggi? Seleziona un&apos;azione rapida o inizia una conversazione.</p>
        </div>

        {/* Quick action grid */}
        <div className="space-y-6">
          {QUICK_ACTION_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.title}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {group.actions.map((action, i) => (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => onAction(action.message)}
                    className="flex items-start gap-3 text-left p-3 rounded-xl border border-white/5 bg-muted/20 backdrop-blur-sm hover:bg-muted/50 hover:border-border transition-all group"
                  >
                    <action.icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', action.color)} />
                    <div>
                      <p className="text-sm font-medium group-hover:text-foreground">{action.label}</p>
                      <p className="text-[10px] text-muted-foreground">{action.subtitle}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
