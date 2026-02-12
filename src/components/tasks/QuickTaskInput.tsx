'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

interface QuickTaskInputProps {
  onCreated: () => void
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

export function QuickTaskInput({ onCreated }: QuickTaskInputProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    const trimmed = title.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed, priority, isPersonal: true }),
      })
      if (res.ok) {
        setTitle('')
        setPriority('MEDIUM')
        onCreated()
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-border/80 bg-card p-2">
      <div className="flex items-center gap-2 flex-1">
        <Plus className="h-5 w-5 text-muted flex-shrink-0 ml-1" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Aggiungi un task veloce..."
          className="flex-1 bg-transparent text-base md:text-sm placeholder:text-muted focus:outline-none min-h-[44px] md:min-h-0"
          disabled={submitting}
        />
      </div>
      <div className="flex items-center gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="h-11 md:h-8 rounded-md border border-border bg-transparent px-2 text-base md:text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 flex-1 sm:flex-none"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || submitting}
          className="h-11 md:h-8 px-4 md:px-3 text-sm md:text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none transition-colors touch-manipulation"
        >
          {submitting ? '...' : 'Aggiungi'}
        </button>
      </div>
    </div>
  )
}
