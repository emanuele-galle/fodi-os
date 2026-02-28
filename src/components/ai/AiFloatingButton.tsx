'use client'

import { Bot } from 'lucide-react'

interface AiFloatingButtonProps {
  onClick: () => void
}

export function AiFloatingButton({ onClick }: AiFloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-xl shadow-violet-500/30 flex items-center justify-center hover:shadow-2xl hover:shadow-violet-500/40 hover:scale-105 active:scale-95 transition-all duration-200 ai-fab-pulse max-md:bottom-20"
      title="Assistente AI"
      aria-label="Apri assistente AI"
    >
      <Bot className="h-6 w-6" />
    </button>
  )
}
