'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export const PROJECT_COLORS = [
  { value: '#3B82F6', label: 'Blu' },
  { value: '#10B981', label: 'Verde' },
  { value: '#F59E0B', label: 'Giallo' },
  { value: '#EF4444', label: 'Rosso' },
  { value: '#8B5CF6', label: 'Viola' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#F97316', label: 'Arancione' },
  { value: '#06B6D4', label: 'Ciano' },
  { value: '#1E293B', label: 'Scuro' },
  { value: '#6366F1', label: 'Indaco' },
] as const

/** Default color for each workspace slug */
export const WORKSPACE_DEFAULT_COLORS: Record<string, string> = {
  commerciale: '#3B82F6',   // Blu
  delivery: '#10B981',      // Verde
  creative: '#8B5CF6',      // Viola
  amministrativo: '#F59E0B', // Giallo (richiesta utente)
}

interface ColorSwatchesProps {
  value: string
  onChange: (color: string) => void
  className?: string
}

export function ColorSwatches({ value, onChange, className }: ColorSwatchesProps) {
  const normalizedValue = value?.toUpperCase()

  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-sm font-medium text-foreground">Colore</label>
      <div className="flex flex-wrap gap-2">
        {PROJECT_COLORS.map((color) => {
          const isSelected = normalizedValue === color.value.toUpperCase()
          return (
            <button
              key={color.value}
              type="button"
              title={color.label}
              onClick={() => onChange(color.value)}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-all duration-150 flex items-center justify-center',
                'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
                isSelected ? 'border-foreground ring-2 ring-foreground/20' : 'border-transparent'
              )}
              style={{ backgroundColor: color.value }}
            >
              {isSelected && (
                <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
