'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'

interface ClientDealsTabProps {
  clientId: string
}

export function ClientDealsTab({ clientId }: ClientDealsTabProps) {
  const STAGE_LABELS: Record<string, string> = { QUALIFICATION: 'Qualificazione', PROPOSAL: 'Proposta', NEGOTIATION: 'Negoziazione', CLOSED_WON: 'Vinta', CLOSED_LOST: 'Persa' }
  const STAGE_COLORS: Record<string, string> = { QUALIFICATION: 'bg-blue-500/10 text-blue-600', PROPOSAL: 'bg-violet-500/10 text-violet-600', NEGOTIATION: 'bg-amber-500/10 text-amber-600', CLOSED_WON: 'bg-emerald-500/10 text-emerald-600', CLOSED_LOST: 'bg-red-500/10 text-red-600' }
  const [deals, setDeals] = useState<Array<{ id: string; title: string; value: string; stage: string; probability: number; expectedCloseDate: string | null; owner?: { firstName: string; lastName: string } | null }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/deals?clientId=${clientId}&limit=50`)
      .then(r => r.json())
      .then(data => setDeals(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
  if (deals.length === 0) return <EmptyState icon={TrendingUp} title="Nessuna opportunità" description="Le opportunità di vendita per questo cliente appariranno qui." action={<Button size="sm" onClick={() => window.location.href = '/crm/pipeline'}><Plus className="h-4 w-4 mr-1" />Nuova Opportunità</Button>} />

  return (
    <div className="space-y-2">
      {deals.map(d => (
        <Card key={d.id} className="!p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-sm font-medium truncate block">{d.title}</span>
              {d.owner && <span className="text-xs text-muted">{d.owner.firstName} {d.owner.lastName}</span>}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {d.expectedCloseDate && (
                <span className="text-xs text-muted">{new Date(d.expectedCloseDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[d.stage] || ''}`}>
                {STAGE_LABELS[d.stage] || d.stage}
              </span>
              <span className="text-sm font-semibold">{formatCurrency(d.value)}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
