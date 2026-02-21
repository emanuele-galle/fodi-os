'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, AlertCircle, Plus, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { CreateDealModal } from '@/components/crm/CreateDealModal'
import dynamic from 'next/dynamic'

const PipelineKanban = dynamic(() => import('@/components/crm/PipelineKanban').then(m => ({ default: m.PipelineKanban })), {
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})

const DealsKanban = dynamic(() => import('@/components/crm/DealsKanban').then(m => ({ default: m.DealsKanban })), {
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})

type TabView = 'deals' | 'clients'

interface Client {
  id: string
  companyName: string
  status: string
  industry: string | null
  totalRevenue: string
}

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
  clientId: string | null
  leadId: string | null
  client: { id: string; companyName: string } | null
  lead: { id: string; name: string; company: string | null } | null
  contact: { id: string; firstName: string; lastName: string } | null
  owner: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
  createdAt: string
  updatedAt: string
}

const DEAL_STAGES = ['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']
const CLIENT_STATUSES = ['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED']

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState<TabView>('deals')
  const [createModalOpen, setCreateModalOpen] = useState(false)

  // Deals state
  const [dealsByStage, setDealsByStage] = useState<Record<string, Deal[]>>({})
  const [dealsLoading, setDealsLoading] = useState(true)
  const [dealsError, setDealsError] = useState<string | null>(null)

  // Clients state
  const [clientsByStatus, setClientsByStatus] = useState<Record<string, Client[]>>({})
  const [clientsLoading, setClientsLoading] = useState(true)
  const [clientsError, setClientsError] = useState<string | null>(null)

  // Load deals
  async function loadDeals() {
    setDealsLoading(true)
    setDealsError(null)
    try {
      const res = await fetch('/api/deals?limit=500')
      if (res.ok) {
        const data = await res.json()
        const grouped: Record<string, Deal[]> = {}
        for (const s of DEAL_STAGES) grouped[s] = []
        for (const deal of data.items || []) {
          if (grouped[deal.stage]) grouped[deal.stage].push(deal)
        }
        setDealsByStage(grouped)
      } else {
        setDealsError('Errore nel caricamento delle opportunità')
      }
    } catch {
      setDealsError('Errore di rete')
    } finally {
      setDealsLoading(false)
    }
  }

  // Load clients
  async function loadClients() {
    setClientsLoading(true)
    setClientsError(null)
    try {
      const res = await fetch('/api/clients?limit=200')
      if (res.ok) {
        const data = await res.json()
        const grouped: Record<string, Client[]> = {}
        for (const s of CLIENT_STATUSES) grouped[s] = []
        for (const client of data.items || []) {
          if (grouped[client.status]) grouped[client.status].push(client)
        }
        setClientsByStatus(grouped)
      } else {
        setClientsError('Errore nel caricamento della pipeline')
      }
    } catch {
      setClientsError('Errore di rete')
    } finally {
      setClientsLoading(false)
    }
  }

  useEffect(() => { loadDeals() }, [])
  useEffect(() => {
    if (activeTab === 'clients' && Object.keys(clientsByStatus).length === 0) {
      loadClients()
    }
  }, [activeTab])

  // Deals stage change handler
  async function handleStageChange(dealId: string, newStage: string) {
    const previousState = { ...dealsByStage }
    for (const key of Object.keys(previousState)) previousState[key] = [...previousState[key]]

    setDealsByStage((prev) => {
      const updated = { ...prev }
      let movedDeal: Deal | undefined
      for (const stage of DEAL_STAGES) {
        const idx = updated[stage]?.findIndex((d) => d.id === dealId)
        if (idx !== undefined && idx >= 0) {
          movedDeal = updated[stage][idx]
          updated[stage] = [...updated[stage]]
          updated[stage].splice(idx, 1)
          break
        }
      }
      if (movedDeal) {
        movedDeal = { ...movedDeal, stage: newStage }
        if (newStage === 'CLOSED_WON') movedDeal.actualCloseDate = new Date().toISOString()
        updated[newStage] = [...(updated[newStage] || []), movedDeal]
      }
      return updated
    })

    try {
      const body: Record<string, unknown> = { stage: newStage }
      if (newStage === 'CLOSED_WON') body.actualCloseDate = new Date().toISOString()
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) setDealsByStage(previousState)
      else if (newStage === 'CLOSED_LOST') loadDeals()
    } catch {
      setDealsByStage(previousState)
    }
  }

  // Clients status change handler
  async function handleStatusChange(clientId: string, newStatus: string) {
    const previousState = { ...clientsByStatus }
    for (const key of Object.keys(previousState)) previousState[key] = [...previousState[key]]

    setClientsByStatus((prev) => {
      const updated = { ...prev }
      let movedClient: Client | undefined
      for (const status of CLIENT_STATUSES) {
        const idx = updated[status]?.findIndex((c) => c.id === clientId)
        if (idx !== undefined && idx >= 0) {
          movedClient = updated[status][idx]
          updated[status] = [...updated[status]]
          updated[status].splice(idx, 1)
          break
        }
      }
      if (movedClient) {
        movedClient = { ...movedClient, status: newStatus }
        updated[newStatus] = [...(updated[newStatus] || []), movedClient]
      }
      return updated
    })

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) setClientsByStatus(previousState)
    } catch {
      setClientsByStatus(previousState)
    }
  }

  // Deal stats
  const allDeals = Object.values(dealsByStage).flat()
  const totalDeals = allDeals.length
  const totalValue = allDeals.reduce((sum, d) => sum + parseFloat(d.value || '0'), 0)
  const weightedValue = allDeals.reduce((sum, d) => sum + (parseFloat(d.value || '0') * d.probability / 100), 0)
  const closedWon = dealsByStage['CLOSED_WON'] || []
  const closedLost = dealsByStage['CLOSED_LOST'] || []
  const winRate = (closedWon.length + closedLost.length) > 0
    ? (closedWon.length / (closedWon.length + closedLost.length) * 100).toFixed(1)
    : '0.0'

  const loading = activeTab === 'deals' ? dealsLoading : clientsLoading
  const fetchError = activeTab === 'deals' ? dealsError : clientsError
  const retry = activeTab === 'deals' ? loadDeals : loadClients

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Pipeline</h1>
            <p className="text-xs md:text-sm text-muted mt-1">
              {activeTab === 'deals'
                ? <>Valore: <span className="font-semibold text-foreground">{formatCurrency(totalValue)}</span></>
                : 'Gestisci lo stato dei clienti nella pipeline'}
            </p>
          </div>
        </div>
        {activeTab === 'deals' && (
          <Button onClick={() => setCreateModalOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Nuova Opportunità
          </Button>
        )}
      </div>

      {/* Tab Toggle */}
      <div className="flex items-center gap-1 mb-6 bg-secondary/30 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('deals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'deals'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Opportunità
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'clients'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          Pipeline Clienti
        </button>
      </div>

      {/* Stats bar for deals */}
      {activeTab === 'deals' && !dealsLoading && (
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
      )}

      {/* Error */}
      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={retry} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64">
              <Skeleton className="h-8 w-full mb-3" />
              <Skeleton className="h-24 w-full mb-2" />
              <Skeleton className="h-24 w-full mb-2" />
            </div>
          ))}
        </div>
      ) : activeTab === 'deals' ? (
        <DealsKanban dealsByStage={dealsByStage} onStageChange={handleStageChange} />
      ) : (
        <PipelineKanban clientsByStatus={clientsByStatus} onStatusChange={handleStatusChange} />
      )}

      <CreateDealModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={loadDeals}
      />
    </div>
  )
}
