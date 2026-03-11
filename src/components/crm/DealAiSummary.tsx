'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface DealAiSummaryProps {
  dealId: string
}

export function DealAiSummary({ dealId }: DealAiSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/deals/${dealId}/summary`)
      const data = await res.json()
      if (data.success) {
        setSummary(data.summary)
      } else {
        setError(data.error || 'Errore nella generazione')
      }
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }, [dealId])

  if (!summary && !loading && !error) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={loadSummary}
        className="gap-1.5 text-xs"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Riepilogo AI
      </Button>
    )
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary">Riepilogo AI</span>
        {summary && (
          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="ml-auto text-[10px] text-primary/60 hover:text-primary transition-colors"
          >
            {loading ? 'Aggiornamento...' : 'Aggiorna'}
          </button>
        )}
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs">Analisi in corso...</span>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {summary && !loading && <p className="text-sm leading-relaxed text-foreground/80">{summary}</p>}
    </div>
  )
}
