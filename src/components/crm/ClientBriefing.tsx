'use client'

import { useState, useCallback } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ClientBriefingProps {
  clientId: string
}

export function ClientBriefing({ clientId }: ClientBriefingProps) {
  const [briefing, setBriefing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBriefing = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/briefing`)
      const data = await res.json()
      if (data.success) {
        setBriefing(data.briefing)
      } else {
        setError(data.error || 'Errore nella generazione')
      }
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  if (!briefing && !loading && !error) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={loadBriefing}
        className="gap-1.5 text-xs"
      >
        <FileText className="h-3.5 w-3.5" />
        Prepara Incontro
      </Button>
    )
  }

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <FileText className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-xs font-semibold text-blue-500">Preparazione Pre-Incontro</span>
        {briefing && (
          <button
            type="button"
            onClick={loadBriefing}
            disabled={loading}
            className="ml-auto text-[10px] text-blue-500/60 hover:text-blue-500 transition-colors"
          >
            {loading ? 'Aggiornamento...' : 'Aggiorna'}
          </button>
        )}
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs">Preparazione in corso...</span>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {briefing && !loading && <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">{briefing}</p>}
    </div>
  )
}
