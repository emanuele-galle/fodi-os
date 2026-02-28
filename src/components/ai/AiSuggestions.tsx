'use client'

import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'

const DEFAULT_SUGGESTIONS = [
  'Quali sono i miei task in scadenza?',
  'Mostrami la pipeline CRM',
  'Cosa ho in calendario oggi?',
  'Report panoramica settimanale',
]

interface AiSuggestionsProps {
  suggestions?: string[]
  onSelect: (suggestion: string) => void
  variant?: 'empty' | 'followup'
}

export function AiSuggestions({ suggestions, onSelect, variant = 'empty' }: AiSuggestionsProps) {
  const items = suggestions?.length ? suggestions : DEFAULT_SUGGESTIONS

  if (variant === 'followup') {
    return (
      <div className="flex flex-wrap gap-1.5 pl-11">
        {items.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => onSelect(s)}
            className="text-xs px-2.5 py-1.5 rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border transition-all"
          >
            {s}
          </motion.button>
        ))}
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
        {items.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(s)}
            className="text-left text-xs px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20 text-foreground/80 hover:bg-muted/60 hover:border-border transition-all"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
