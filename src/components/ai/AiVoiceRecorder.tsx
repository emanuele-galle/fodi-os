'use client'

import { Square } from 'lucide-react'

interface AiVoiceRecorderProps {
  duration: number
  onStop: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function AiVoiceRecorder({ duration, onStop }: AiVoiceRecorderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-xl">
      {/* Recording indicator */}
      <div className="flex items-center gap-2 flex-1">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 ai-voice-pulse" />
        <span className="text-sm font-medium text-red-400">Registrazione...</span>
        <span className="text-xs text-muted-foreground/60 font-mono">{formatDuration(duration)}</span>
      </div>

      {/* Stop button */}
      <button
        onClick={onStop}
        className="p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
        title="Ferma registrazione"
      >
        <Square className="h-4 w-4 fill-current" />
      </button>
    </div>
  )
}
