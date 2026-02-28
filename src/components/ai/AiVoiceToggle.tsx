'use client'

import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiVoiceToggleProps {
  enabled: boolean
  onToggle: () => void
}

export function AiVoiceToggle({ enabled, onToggle }: AiVoiceToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'p-2 rounded-lg transition-colors',
        enabled
          ? 'bg-violet-500/15 text-violet-400 hover:bg-violet-500/20'
          : 'hover:bg-white/[0.06] text-muted-foreground/60',
      )}
      title={enabled ? 'Disattiva voce' : 'Attiva voce'}
    >
      {enabled ? (
        <Volume2 className="h-4 w-4" />
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
    </button>
  )
}
