'use client'

import { useState, useCallback } from 'react'
import { useFetch } from '@/hooks/useFetch'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Sparkles, Check, X, Phone, Mail, Calendar, CheckSquare, TrendingUp } from 'lucide-react'

interface Suggestion {
  id: string
  type: string
  title: string
  description: string
  priority: string
  actionType: string | null
  status: string
  createdAt: string
  client: { id: string; companyName: string }
}

const TYPE_LABELS: Record<string, string> = {
  FOLLOWUP: 'Follow-up',
  OPPORTUNITY: 'Opportunita',
  CHURN_RISK: 'Rischio churn',
  TOUCHPOINT: 'Touchpoint',
}

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: 'bg-red-500/15 text-red-600',
  HIGH: 'bg-amber-500/15 text-amber-600',
  MEDIUM: 'bg-blue-500/15 text-blue-600',
  LOW: 'bg-zinc-500/15 text-zinc-500',
}

const ACTION_ICONS: Record<string, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  TASK: CheckSquare,
  DEAL: TrendingUp,
}

interface AiSuggestionsPanelProps {
  clientId?: string
  limit?: number
}

export function AiSuggestionsPanel({ clientId, limit = 5 }: AiSuggestionsPanelProps) {
  const url = clientId
    ? `/api/crm/suggestions?clientId=${clientId}&limit=${limit}`
    : `/api/crm/suggestions?limit=${limit}`

  const { data, loading, refetch } = useFetch<{ success: boolean; data: Suggestion[] }>(url)
  const [processing, setProcessing] = useState<string | null>(null)

  const handleAction = useCallback(async (id: string, status: 'ACCEPTED' | 'DISMISSED') => {
    setProcessing(id)
    try {
      await fetch(`/api/crm/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      refetch()
    } finally {
      setProcessing(null)
    }
  }, [refetch])

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  const suggestions = data?.success ? data.data : []
  if (suggestions.length === 0) return null

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Suggerimenti AI</h3>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {suggestions.length}
          </span>
        </div>
        <div className="space-y-3">
          {suggestions.map((s) => {
            const ActionIcon = s.actionType ? ACTION_ICONS[s.actionType] || Sparkles : Sparkles
            const isProcessing = processing === s.id
            return (
              <div key={s.id} className="rounded-lg border border-border/30 p-3 hover:bg-muted/5 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <ActionIcon className="h-3.5 w-3.5 text-muted flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{s.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[s.priority] || PRIORITY_STYLES.MEDIUM}`}>
                      {s.priority}
                    </span>
                    <span className="text-[10px] text-muted bg-muted/15 px-1.5 py-0.5 rounded-full">
                      {TYPE_LABELS[s.type] || s.type}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted leading-relaxed mb-2">{s.description}</p>
                {!clientId && (
                  <p className="text-[10px] text-muted/60 mb-2">{s.client.companyName}</p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    disabled={isProcessing}
                    onClick={() => handleAction(s.id, 'ACCEPTED')}
                  >
                    <Check className="h-3 w-3" /> Accetta
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-muted"
                    disabled={isProcessing}
                    onClick={() => handleAction(s.id, 'DISMISSED')}
                  >
                    <X className="h-3 w-3" /> Ignora
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
