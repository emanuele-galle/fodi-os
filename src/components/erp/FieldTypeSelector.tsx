'use client'

import {
  Type, AlignLeft, Mail, Phone, Hash,
  List, ListChecks, CircleDot, CheckSquare,
  Calendar, Upload, Star, SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FIELD_TYPES = [
  { type: 'TEXT', label: 'Testo', icon: Type },
  { type: 'TEXTAREA', label: 'Area di testo', icon: AlignLeft },
  { type: 'EMAIL', label: 'Email', icon: Mail },
  { type: 'PHONE', label: 'Telefono', icon: Phone },
  { type: 'NUMBER', label: 'Numero', icon: Hash },
  { type: 'SELECT', label: 'Selezione', icon: List },
  { type: 'MULTISELECT', label: 'Selezione multipla', icon: ListChecks },
  { type: 'RADIO', label: 'Scelta singola', icon: CircleDot },
  { type: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare },
  { type: 'DATE', label: 'Data', icon: Calendar },
  { type: 'FILE', label: 'File', icon: Upload },
  { type: 'RATING', label: 'Valutazione', icon: Star },
  { type: 'SCALE', label: 'Scala', icon: SlidersHorizontal },
] as const

interface FieldTypeSelectorProps {
  value: string
  onChange: (type: string) => void
}

export function FieldTypeSelector({ value, onChange }: FieldTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={cn(
            'flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all text-left',
            value === type
              ? 'border-primary bg-primary/10 text-primary font-medium'
              : 'border-border/40 hover:border-border hover:bg-secondary/30'
          )}
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </div>
  )
}
