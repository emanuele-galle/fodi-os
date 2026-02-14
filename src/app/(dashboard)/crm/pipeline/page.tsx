'use client'

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import dynamic from 'next/dynamic'

const PipelineKanban = dynamic(() => import('@/components/crm/PipelineKanban').then(m => ({ default: m.PipelineKanban })), {
  loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
})

interface Client {
  id: string
  companyName: string
  status: string
  industry: string | null
  totalRevenue: string
}

const STATUSES = ['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED']

export default function PipelinePage() {
  const [clientsByStatus, setClientsByStatus] = useState<Record<string, Client[]>>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  async function loadClients() {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/clients?limit=200')
      if (res.ok) {
        const data = await res.json()
        const grouped: Record<string, Client[]> = {}
        for (const s of STATUSES) grouped[s] = []
        for (const client of data.items || []) {
          if (grouped[client.status]) {
            grouped[client.status].push(client)
          }
        }
        setClientsByStatus(grouped)
      } else {
        setFetchError('Errore nel caricamento della pipeline')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento della pipeline')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  async function handleStatusChange(clientId: string, newStatus: string) {
    // Save previous state for rollback
    const previousState = { ...clientsByStatus }
    for (const key of Object.keys(previousState)) {
      previousState[key] = [...previousState[key]]
    }

    // Optimistic update
    setClientsByStatus((prev) => {
      const updated = { ...prev }
      let movedClient: Client | undefined

      // Remove from old column
      for (const status of STATUSES) {
        const idx = updated[status]?.findIndex((c) => c.id === clientId)
        if (idx !== undefined && idx >= 0) {
          movedClient = updated[status][idx]
          updated[status] = [...updated[status]]
          updated[status].splice(idx, 1)
          break
        }
      }

      // Add to new column
      if (movedClient) {
        movedClient = { ...movedClient, status: newStatus }
        updated[newStatus] = [...(updated[newStatus] || []), movedClient]
      }

      return updated
    })

    // PATCH API with rollback on failure
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        setClientsByStatus(previousState)
      }
    } catch {
      setClientsByStatus(previousState)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Pipeline Commerciale</h1>
          <p className="text-xs md:text-sm text-muted mt-1">Gestisci lo stato dei clienti nella pipeline</p>
        </div>
      </div>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => loadClients()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((s) => (
            <div key={s} className="flex-shrink-0 w-64">
              <Skeleton className="h-8 w-full mb-3" />
              <Skeleton className="h-24 w-full mb-2" />
              <Skeleton className="h-24 w-full mb-2" />
            </div>
          ))}
        </div>
      ) : (
        <PipelineKanban
          clientsByStatus={clientsByStatus}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
