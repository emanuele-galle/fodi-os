'use client'

import { motion } from 'motion/react'
import { Sparkles, CheckSquare, Users, Calendar, Receipt, Headphones, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_SUGGESTIONS = [
  'Quali sono i miei task in scadenza?',
  'Mostrami la pipeline CRM',
  'Cosa ho in calendario oggi?',
  'Report panoramica settimanale',
]

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  'CRM': ['Lead recenti', 'Pipeline deal', 'Cerca cliente', 'Statistiche CRM'],
  'CRM > Lead': ['Lead da contattare', 'Crea un nuovo lead', 'Lead per sorgente', 'Converti lead in cliente'],
  'CRM > Pipeline Deal': ['Valore totale pipeline', 'Deal in scadenza', 'Crea nuova trattativa', 'Statistiche CRM'],
  'CRM > Clienti': ['Top clienti per fatturato', 'Clienti inattivi', 'Cerca cliente', 'Nuove interazioni'],
  'ERP & Finanza': ['Fatturato mensile', 'Spese recenti', 'Preventivi in attesa', 'Scadenze fatture'],
  'ERP > Preventivi': ['Preventivi in attesa', 'Crea un preventivo', 'Preventivi scaduti', 'Fatturato da preventivi'],
  'ERP > Spese': ['Spese del mese', 'Registra una spesa', 'Spese per categoria', 'Spese ricorrenti'],
  'ERP > Entrate': ['Entrate del mese', 'Fatture non pagate', 'Registra un\'entrata', 'Confronto mensile'],
  'Task & Progetti': ['Task urgenti', 'I miei task in scadenza', 'Crea un task', 'Carico del team'],
  'Calendario': ['Agenda di oggi', 'Cosa ho domani?', 'Trova uno slot libero', 'Crea un evento'],
  'Support > Ticket': ['Ticket aperti', 'Ticket urgenti', 'Crea un ticket', 'Ticket non assegnati'],
  'Time Tracking': ['Ore registrate oggi', 'Registra ore', 'Riepilogo settimanale', 'Ore per progetto'],
}

function getSuggestionIcon(text: string): { icon: typeof Sparkles; color: string } {
  const lower = text.toLowerCase()
  if (lower.includes('task') || lower.includes('scadenz') || lower.includes('progett')) return { icon: CheckSquare, color: 'text-blue-400' }
  if (lower.includes('crm') || lower.includes('lead') || lower.includes('client') || lower.includes('pipeline') || lower.includes('deal') || lower.includes('trattativ')) return { icon: Users, color: 'text-emerald-400' }
  if (lower.includes('calendario') || lower.includes('agenda') || lower.includes('oggi') || lower.includes('evento') || lower.includes('slot')) return { icon: Calendar, color: 'text-orange-400' }
  if (lower.includes('report') || lower.includes('fattur') || lower.includes('spese') || lower.includes('preventiv') || lower.includes('entrat')) return { icon: Receipt, color: 'text-violet-400' }
  if (lower.includes('ticket') || lower.includes('support')) return { icon: Headphones, color: 'text-amber-400' }
  if (lower.includes('ore') || lower.includes('tempo') || lower.includes('time')) return { icon: Clock, color: 'text-cyan-400' }
  return { icon: Sparkles, color: 'text-muted-foreground' }
}

interface AiSuggestionsProps {
  suggestions?: string[]
  onSelect: (suggestion: string) => void
  variant?: 'empty' | 'followup'
  currentPage?: string
}

export function AiSuggestions({ suggestions, onSelect, variant = 'empty', currentPage }: AiSuggestionsProps) {
  const contextSuggestions = currentPage ? PAGE_SUGGESTIONS[currentPage] : undefined
  const items = suggestions?.length ? suggestions : (contextSuggestions || DEFAULT_SUGGESTIONS)

  if (variant === 'followup') {
    return (
      <div className="flex flex-wrap gap-1.5 pl-11">
        {items.map((s, i) => {
          const { icon: Icon, color } = getSuggestionIcon(s)
          return (
            <motion.button
              key={s}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSelect(s)}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border transition-all"
            >
              <Icon className={cn('h-3 w-3', color)} />
              {s}
            </motion.button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        <span>Suggerimenti</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((s, i) => {
          const { icon: Icon, color } = getSuggestionIcon(s)
          return (
            <motion.button
              key={s}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSelect(s)}
              className="flex items-center gap-2 text-left text-xs px-3 py-2.5 rounded-xl border border-white/5 bg-muted/20 backdrop-blur-sm text-foreground/80 hover:bg-muted/60 hover:border-border transition-all"
            >
              <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', color)} />
              {s}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
