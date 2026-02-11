'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Search,
  Users,
  FolderKanban,
  Receipt,
  BookOpen,
  LifeBuoy,
  Plus,
  ArrowRight,
} from 'lucide-react'

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
}

const commands: CommandItem[] = [
  // Navigation
  { id: 'dashboard', label: 'Dashboard', icon: FolderKanban, href: '/dashboard', group: 'navigate' },
  { id: 'crm', label: 'CRM - Clienti', icon: Users, href: '/crm', group: 'navigate' },
  { id: 'projects', label: 'Progetti', icon: FolderKanban, href: '/projects', group: 'navigate' },
  { id: 'quotes', label: 'Preventivi', icon: Receipt, href: '/erp/quotes', group: 'navigate' },
  { id: 'invoices', label: 'Fatture', icon: Receipt, href: '/erp/invoices', group: 'navigate' },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen, href: '/kb', group: 'navigate' },
  { id: 'support', label: 'Supporto', icon: LifeBuoy, href: '/support', group: 'navigate' },
  // Actions
  { id: 'new-client', label: 'Nuovo Cliente', description: 'Crea un nuovo cliente', icon: Plus, href: '/crm?action=new', group: 'action' },
  { id: 'new-project', label: 'Nuovo Progetto', description: 'Crea un nuovo progetto', icon: Plus, href: '/projects?action=new', group: 'action' },
  { id: 'new-quote', label: 'Nuovo Preventivo', description: 'Crea un preventivo', icon: Plus, href: '/erp/quotes/new', group: 'action' },
  { id: 'new-ticket', label: 'Nuovo Ticket', description: 'Apri un ticket di supporto', icon: Plus, href: '/support?action=new', group: 'action' },
]

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const filtered = query
    ? commands.filter(
        (cmd) =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
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

  if (!open) return null

  const groups = {
    navigate: filtered.filter((c) => c.group === 'navigate'),
    action: filtered.filter((c) => c.group === 'action'),
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        className="max-w-lg mx-auto mt-[20vh] bg-card rounded-xl border border-border shadow-[var(--shadow-xl)] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="h-5 w-5 text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            placeholder="Cerca pagine, azioni, clienti..."
            className="flex-1 h-14 bg-transparent text-foreground placeholder:text-muted focus:outline-none"
          />
          <kbd className="text-xs text-muted bg-secondary px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {groups.navigate.length > 0 && (
            <div>
              <p className="px-4 py-1 text-xs font-medium text-muted uppercase">Navigazione</p>
              {groups.navigate.map((cmd, i) => {
                const globalIndex = filtered.indexOf(cmd)
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      if (cmd.href) router.push(cmd.href)
                      onClose()
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                      globalIndex === selectedIndex
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-secondary'
                    )}
                  >
                    <cmd.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{cmd.label}</span>
                    <ArrowRight className="h-3 w-3 ml-auto text-muted" />
                  </button>
                )
              })}
            </div>
          )}

          {groups.action.length > 0 && (
            <div className="mt-2">
              <p className="px-4 py-1 text-xs font-medium text-muted uppercase">Azioni Rapide</p>
              {groups.action.map((cmd) => {
                const globalIndex = filtered.indexOf(cmd)
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      if (cmd.href) router.push(cmd.href)
                      onClose()
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
                      globalIndex === selectedIndex
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-secondary'
                    )}
                  >
                    <cmd.icon className="h-4 w-4 flex-shrink-0" />
                    <div className="text-left">
                      <span>{cmd.label}</span>
                      {cmd.description && (
                        <span className="text-xs text-muted ml-2">{cmd.description}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Nessun risultato per &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
