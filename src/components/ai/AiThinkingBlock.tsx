'use client'

import { useState } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiThinkingBlockProps {
  thinking: string
  isThinking?: boolean
}

export function AiThinkingBlock({ thinking, isThinking }: AiThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false)

  if (!thinking) return null

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors',
          'hover:bg-violet-500/10 text-muted-foreground/60 hover:text-muted-foreground/80',
          isThinking && 'text-violet-400/70',
        )}
      >
        <Brain className={cn('h-3.5 w-3.5', isThinking && 'animate-pulse text-violet-400')} />
        <span>{isThinking ? 'Sto ragionando...' : 'Ragionamento'}</span>
        {!isThinking && (
          expanded
            ? <ChevronDown className="h-3 w-3" />
            : <ChevronRight className="h-3 w-3" />
        )}
      </button>

      {(expanded || isThinking) && (
        <div className={cn(
          'mt-1 px-3 py-2 rounded-lg text-xs leading-relaxed',
          'bg-violet-500/[0.05] border border-violet-500/10 text-muted-foreground/50',
          'max-h-48 overflow-y-auto ai-scrollbar whitespace-pre-wrap',
        )}>
          {thinking}
          {isThinking && <span className="animate-pulse">|</span>}
        </div>
      )}
    </div>
  )
}
