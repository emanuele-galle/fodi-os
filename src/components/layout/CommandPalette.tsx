'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'motion/react'
import {
  Search,
  SendHorizontal,
  Users,
  FolderKanban,
  Receipt,
  LifeBuoy,
  Plus,
  ArrowRight,
  LayoutDashboard,
  CalendarDays,
  MessageCircle,
  Settings,
  Building2,
  CheckSquare,
  FileText,
  Loader2,
} from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  href?: string
  action?: () => void
  group: 'navigate' | 'action' | 'search'
  shortcut?: string
}

interface SearchResults {
  clients: { id: string; companyName: string; slug?: string }[]
  projects: { id: string; name: string; slug?: string }[]
  tasks: { id: string; title: string; projectId?: string }[]
  quotes: { id: string; number: string; title: string }[]
  invoices: { id: string; number: string; title: string }[]
  tickets: { id: string; number: string; subject: string }[]
}

const commands: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', group: 'navigate' },
  { id: 'tasks', label: 'I Miei Task', icon: FolderKanban, href: '/tasks', group: 'navigate', shortcut: 'T' },
  { id: 'chat', label: 'Chat', icon: MessageCircle, href: '/chat', group: 'navigate', shortcut: 'C' },
  { id: 'internal', label: 'Azienda', icon: Building2, href: '/internal', group: 'navigate' },
  { id: 'crm', label: 'CRM - Clienti', icon: Users, href: '/crm', group: 'navigate' },
  { id: 'projects', label: 'Progetti Clienti', icon: FolderKanban, href: '/projects', group: 'navigate' },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays, href: '/calendar', group: 'navigate' },
  { id: 'quotes', label: 'Preventivi', icon: Receipt, href: '/erp/quotes', group: 'navigate' },
  { id: 'invoices', label: 'Fatture', icon: Receipt, href: '/erp/invoices', group: 'navigate' },
{ id: 'support', label: 'Supporto', icon: LifeBuoy, href: '/support', group: 'navigate' },
  { id: 'settings', label: 'Impostazioni', icon: Settings, href: '/settings', group: 'navigate' },
  { id: 'new-client', label: 'Nuovo Cliente', description: 'Crea un nuovo cliente', icon: Plus, href: '/crm?action=new', group: 'action' },
  { id: 'new-project', label: 'Nuovo Progetto', description: 'Crea un nuovo progetto', icon: Plus, href: '/projects?action=new', group: 'action' },
  { id: 'new-quote', label: 'Nuovo Preventivo', description: 'Crea un preventivo', icon: Plus, href: '/erp/quotes/new', group: 'action' },
  { id: 'new-ticket', label: 'Nuovo Ticket', description: 'Apri un ticket supporto', icon: Plus, href: '/support?action=new', group: 'action' },
]

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchResults, setSearchResults] = useState<CommandItem[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const debouncedQuery = useDebounce(query, 300)

  const fetchSearchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) return
      const data: SearchResults = await res.json()
      const items: CommandItem[] = []

      for (const client of data.clients) {
        items.push({
          id: `client-${client.id}`,
          label: client.companyName,
          description: 'Cliente',
          icon: Users,
          href: `/crm/${client.id}`,
          group: 'search',
        })
      }
      for (const project of data.projects) {
        items.push({
          id: `project-${project.id}`,
          label: project.name,
          description: 'Progetto',
          icon: FolderKanban,
          href: `/projects/${project.id}`,
          group: 'search',
        })
      }
      for (const task of data.tasks) {
        items.push({
          id: `task-${task.id}`,
          label: task.title,
          description: 'Task',
          icon: CheckSquare,
          href: `/tasks?taskId=${task.id}`,
          group: 'search',
        })
      }
      for (const quote of data.quotes) {
        items.push({
          id: `quote-${quote.id}`,
          label: `${quote.number} - ${quote.title}`,
          description: 'Preventivo',
          icon: FileText,
          href: `/erp/quotes/${quote.id}`,
          group: 'search',
        })
      }
      for (const invoice of data.invoices) {
        items.push({
          id: `invoice-${invoice.id}`,
          label: `${invoice.number} - ${invoice.title}`,
          description: 'Fattura',
          icon: Receipt,
          href: `/erp/invoices/${invoice.id}`,
          group: 'search',
        })
      }
      for (const ticket of data.tickets) {
        items.push({
          id: `ticket-${ticket.id}`,
          label: `${ticket.number} - ${ticket.subject}`,
          description: 'Ticket',
          icon: LifeBuoy,
          href: `/support/${ticket.id}`,
          group: 'search',
        })
      }

      setSearchResults(items)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    fetchSearchResults(debouncedQuery)
  }, [debouncedQuery, fetchSearchResults])

  const filteredCommands = query
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  const filtered = [...filteredCommands, ...searchResults]

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault()
        const cmd = filtered[selectedIndex]
        if (cmd.href) router.push(cmd.href)
        if (cmd.action) cmd.action()
        onClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, filtered, selectedIndex, router, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!open) return null

  const groups = {
    search: filtered.filter((c) => c.group === 'search'),
    navigate: filtered.filter((c) => c.group === 'navigate'),
    action: filtered.filter((c) => c.group === 'action'),
  }

  const hasQuery = query.length > 0

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Ricerca comandi" onClick={onClose}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Dialog */}
      <div className="relative flex justify-center pt-[15vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="w-full max-w-lg mx-4 bg-card/95 backdrop-blur-xl rounded-xl border border-border/30 shadow-[var(--shadow-xl)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-border/40">
            <AnimatePresence mode="wait">
              {hasQuery ? (
                <motion.div
                  key="send"
                  initial={{ opacity: 0, rotate: -45 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 45 }}
                  transition={{ duration: 0.15 }}
                >
                  <SendHorizontal className="h-5 w-5 text-primary flex-shrink-0" />
                </motion.div>
              ) : (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, rotate: 45 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -45 }}
                  transition={{ duration: 0.15 }}
                >
                  <Search className="h-5 w-5 text-muted flex-shrink-0" />
                </motion.div>
              )}
            </AnimatePresence>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Cerca pagine, azioni..."
              className="flex-1 h-14 bg-transparent text-foreground placeholder:text-muted/60 focus:outline-none text-[15px]"
            />
            <kbd className="text-[11px] text-muted/70 bg-secondary/60 px-1.5 py-0.5 rounded-md font-mono">ESC</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[360px] overflow-y-auto py-1.5 scrollbar-none">
            {searching && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Ricerca in corso...
              </div>
            )}

            {groups.search.length > 0 && (
              <div className="px-2">
                <p className="px-2 py-1.5 text-[11px] font-medium text-muted/70 uppercase tracking-wider">
                  Risultati
                </p>
                {groups.search.map((cmd) => {
                  const globalIndex = filtered.indexOf(cmd)
                  return (
                    <motion.button
                      key={cmd.id}
                      data-index={globalIndex}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(globalIndex * 0.02, 0.2), duration: 0.15 }}
                      onClick={() => {
                        if (cmd.href) router.push(cmd.href)
                        onClose()
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
                        globalIndex === selectedIndex
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/80 hover:bg-secondary/50'
                      )}
                    >
                      <cmd.icon className="h-4 w-4 flex-shrink-0 opacity-70" />
                      <div className="flex-1 text-left truncate">
                        <span>{cmd.label}</span>
                        {cmd.description && (
                          <span className="text-xs text-muted/60 ml-2">{cmd.description}</span>
                        )}
                      </div>
                      <ArrowRight className={cn(
                        'h-3 w-3 transition-opacity',
                        globalIndex === selectedIndex ? 'opacity-70' : 'opacity-0'
                      )} />
                    </motion.button>
                  )
                })}
              </div>
            )}

            {groups.navigate.length > 0 && (
              <div className="px-2">
                <p className="px-2 py-1.5 text-[11px] font-medium text-muted/70 uppercase tracking-wider">
                  Navigazione
                </p>
                {groups.navigate.map((cmd) => {
                  const globalIndex = filtered.indexOf(cmd)
                  return (
                    <motion.button
                      key={cmd.id}
                      data-index={globalIndex}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: globalIndex * 0.02, duration: 0.15 }}
                      onClick={() => {
                        if (cmd.href) router.push(cmd.href)
                        onClose()
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
                        globalIndex === selectedIndex
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/80 hover:bg-secondary/50'
                      )}
                    >
                      <cmd.icon className="h-4 w-4 flex-shrink-0 opacity-70" />
                      <span className="flex-1 text-left">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] text-muted/60 bg-secondary/50 px-1.5 py-0.5 rounded font-mono">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      <ArrowRight className={cn(
                        'h-3 w-3 transition-opacity',
                        globalIndex === selectedIndex ? 'opacity-70' : 'opacity-0'
                      )} />
                    </motion.button>
                  )
                })}
              </div>
            )}

            {groups.action.length > 0 && (
              <div className="px-2 mt-1">
                <p className="px-2 py-1.5 text-[11px] font-medium text-muted/70 uppercase tracking-wider">
                  Azioni Rapide
                </p>
                {groups.action.map((cmd) => {
                  const globalIndex = filtered.indexOf(cmd)
                  return (
                    <motion.button
                      key={cmd.id}
                      data-index={globalIndex}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: globalIndex * 0.02, duration: 0.15 }}
                      onClick={() => {
                        if (cmd.href) router.push(cmd.href)
                        onClose()
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
                        globalIndex === selectedIndex
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/80 hover:bg-secondary/50'
                      )}
                    >
                      <cmd.icon className="h-4 w-4 flex-shrink-0 opacity-70" />
                      <div className="flex-1 text-left">
                        <span>{cmd.label}</span>
                        {cmd.description && (
                          <span className="text-xs text-muted/60 ml-2">{cmd.description}</span>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}

            {filtered.length === 0 && !searching && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-muted/60">
                  Nessun risultato per &ldquo;{query}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 text-[11px] text-muted/50">
            <span>
              <kbd className="bg-secondary/50 px-1 py-0.5 rounded font-mono mr-0.5">↑↓</kbd> naviga
              <kbd className="bg-secondary/50 px-1 py-0.5 rounded font-mono ml-2 mr-0.5">↵</kbd> apri
            </span>
            <span>
              <kbd className="bg-secondary/50 px-1 py-0.5 rounded font-mono mr-0.5">⌘K</kbd> toggle
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
