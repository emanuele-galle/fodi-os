'use client'

interface AiFloatingButtonProps {
  onClick: () => void
}

export function AiFloatingButton({ onClick }: AiFloatingButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-xl shadow-violet-500/30 flex items-center justify-center hover:shadow-2xl hover:shadow-violet-500/40 hover:scale-110 active:scale-95 transition-all duration-300 ai-fab-glow max-md:bottom-20"
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
  )
}
