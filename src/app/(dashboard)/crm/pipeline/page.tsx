'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { PipelineKanban } from '@/components/crm/PipelineKanban'

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

  useEffect(() => {
    async function load() {
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
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleStatusChange(clientId: string, newStatus: string) {
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

    // PATCH API
    await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline Commerciale</h1>
          <p className="text-sm text-muted mt-1">Gestisci lo stato dei clienti nella pipeline</p>
        </div>
      </div>

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
