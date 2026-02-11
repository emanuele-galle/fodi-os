'use client'

import { Video } from 'lucide-react'
import { Button } from './Button'

interface MeetButtonProps {
  meetLink: string
  size?: 'sm' | 'md'
  variant?: 'primary' | 'outline' | 'ghost'
  label?: string
}

export function MeetButton({ meetLink, size = 'sm', variant = 'primary', label = 'Partecipa a Meet' }: MeetButtonProps) {
  return (
    <Button
      size={size}
      variant={variant}
      onClick={() => window.open(meetLink, '_blank', 'noopener,noreferrer')}
    >
      <Video className="h-4 w-4 mr-1.5" />
      {label}
    </Button>
  )
}
