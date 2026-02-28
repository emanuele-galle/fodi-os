'use client'

import { useState, useEffect } from 'react'
import { Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiFloatingButtonProps {
  onClick: () => void
  onVoiceClick?: () => void
}

export function AiFloatingButton({ onClick, onVoiceClick }: AiFloatingButtonProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(false)

  useEffect(() => {
    fetch('/api/ai/config/public')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data?.voiceAgentEnabled) setVoiceEnabled(true)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3 max-md:bottom-20">
      {/* Voice FAB (above main FAB) */}
      {voiceEnabled && onVoiceClick && (
        <button
          onClick={onVoiceClick}
          className={cn(
            'w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white',
            'shadow-lg shadow-cyan-500/20 flex items-center justify-center',
            'hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-110 active:scale-95',
            'transition-all duration-300',
          )}
          title="Parla con Giusy"
          aria-label="Apri assistente vocale"
        >
          <Mic className="w-4.5 h-4.5 drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
        </button>
      )}

      {/* Main AI FAB */}
      <button
        onClick={onClick}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-xl shadow-violet-500/30 flex items-center justify-center hover:shadow-2xl hover:shadow-violet-500/40 hover:scale-110 active:scale-95 transition-all duration-300 ai-fab-glow"
        title="Assistente AI"
        aria-label="Apri assistente AI"
      >
        {/* Neural network AI icon */}
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]">
          <circle cx="12" cy="8" r="1.8" fill="currentColor" />
          <circle cx="7.5" cy="13.5" r="1.8" fill="currentColor" />
          <circle cx="16.5" cy="13.5" r="1.8" fill="currentColor" />
          <circle cx="12" cy="18" r="1.3" fill="currentColor" opacity="0.7" />
          <line x1="12" y1="9.8" x2="8.3" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          <line x1="12" y1="9.8" x2="15.7" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.7" />
          <line x1="8.3" y1="15" x2="11.3" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <line x1="15.7" y1="15" x2="12.7" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <line x1="9.3" y1="13.5" x2="14.7" y2="13.5" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
        </svg>
      </button>
    </div>
  )
}
