'use client'

import { Badge } from '@/components/ui/Badge'

const DIFFICULTY_CONFIG = {
  BEGINNER: { label: 'Principiante', variant: 'success' as const },
  INTERMEDIATE: { label: 'Intermedio', variant: 'warning' as const },
  ADVANCED: { label: 'Avanzato', variant: 'destructive' as const },
}

interface DifficultyBadgeProps {
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  className?: string
}

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const config = DIFFICULTY_CONFIG[difficulty]
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
