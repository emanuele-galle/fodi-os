'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle, Plus } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import dynamic from 'next/dynamic'
import { formatCurrency } from '@/lib/utils'
import { CreateDealModal } from '@/components/crm/CreateDealModal'

const DealsKanban = dynamic(() => import('@/components/crm/DealsKanban').then(m => ({ default: m.DealsKanban })), {
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})

interface Deal {
  id: string
  title: string
  description: string | null
  value: string
  stage: string
  probability: number
  expectedCloseDate: string | null
  actualCloseDate: string | null
  lostReason: string | null
  clientId: string
  client: { id: string; companyName: string }
  contact: { id: string; firstName: string; lastName: string } | null
  owner: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
  createdAt: string
  updatedAt: string
}

const DEAL_STAGES = ['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']

export default function DealsPage() {
  const [dealsByStage, setDealsByStage] = useState<Record<string, Deal[]>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  async function loadDeals() {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/deals?limit=500')
      if (res.ok) {
        const data = await res.json()
        const grouped: Record<string, Deal[]> = {}
        for (const s of DEAL_STAGES) grouped[s] = []
        for (const deal of data.items || []) {
          if (grouped[deal.stage]) {
            grouped[deal.stage].push(deal)
          }
        }
        setDealsByStage(grouped)
      } else {
        setFetchError('Errore nel caricamento delle opportunità')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento delle opportunità')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeals()
  }, [])

  async function handleStageChange(dealId: string, newStage: string) {
    // Save previous state for rollback
    const previousState = { ...dealsByStage }
    for (const key of Object.keys(previousState)) {
      previousState[key] = [...previousState[key]]
    }

    // Optimistic update
    setDealsByStage((prev) => {
      const updated = { ...prev }
      let movedDeal: Deal | undefined

      // Remove from old column
      for (const stage of DEAL_STAGES) {
        const idx = updated[stage]?.findIndex((d) => d.id === dealId)
        if (idx !== undefined && idx >= 0) {
          movedDeal = updated[stage][idx]
          updated[stage] = [...updated[stage]]
          updated[stage].splice(idx, 1)
          break
        }
      }

      // Add to new column
      if (movedDeal) {
        movedDeal = { ...movedDeal, stage: newStage }
        // Auto-set actualCloseDate for CLOSED_WON
        if (newStage === 'CLOSED_WON') {
          movedDeal.actualCloseDate = new Date().toISOString()
        }
        updated[newStage] = [...(updated[newStage] || []), movedDeal]
      }

      return updated
    })

    // PATCH API with rollback on failure
    try {
      const body: any = { stage: newStage }
      if (newStage === 'CLOSED_WON') {
        body.actualCloseDate = new Date().toISOString()
      }

      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setDealsByStage(previousState)
      } else {
        // If moved to CLOSED_LOST, could show modal for lostReason
        // For now, just reload to get fresh data
        if (newStage === 'CLOSED_LOST') {
          loadDeals()
        }
      }
    } catch {
      setDealsByStage(previousState)
    }
  }

  // Calculate stats
  const allDeals = Object.values(dealsByStage).flat()
  const totalDeals = allDeals.length
  const totalValue = allDeals.reduce((sum, d) => sum + parseFloat(d.value || '0'), 0)
  const weightedValue = allDeals.reduce((sum, d) => sum + (parseFloat(d.value || '0') * d.probability / 100), 0)
  const closedWon = dealsByStage['CLOSED_WON'] || []
  const closedLost = dealsByStage['CLOSED_LOST'] || []
  const winRate = (closedWon.length + closedLost.length) > 0
    ? (closedWon.length / (closedWon.length + closedLost.length) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Opportunità</h1>
            <p className="text-xs md:text-sm text-muted mt-1">
              Pipeline: <span className="font-semibold text-foreground">{formatCurrency(totalValue)}</span>
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuova Opportunità
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-border/40 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Totale Deal</p>
          <p className="text-lg font-bold">{totalDeals}</p>
        </div>
        <div className="bg-card border border-border/40 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Valore Totale</p>
          <p className="text-lg font-bold">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-card border border-border/40 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Valore Ponderato</p>
          <p className="text-lg font-bold">{formatCurrency(weightedValue)}</p>
        </div>
        <div className="bg-card border border-border/40 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Win Rate</p>
          <p className="text-lg font-bold">{winRate}%</p>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => loadDeals()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((s) => (
            <div key={s} className="flex-shrink-0 w-64">
              <Skeleton className="h-8 w-full mb-3" />
              <Skeleton className="h-24 w-full mb-2" />
              <Skeleton className="h-24 w-full mb-2" />
            </div>
          ))}
        </div>
      ) : (
        <DealsKanban
          dealsByStage={dealsByStage}
          onStageChange={handleStageChange}
        />
      )}

      <CreateDealModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={loadDeals}
      />
    </div>
  )
}
