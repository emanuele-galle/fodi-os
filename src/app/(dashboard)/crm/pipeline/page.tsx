'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface Client {
  id: string
  companyName: string
  status: string
  industry: string | null
  totalRevenue: string
}

const COLUMNS = [
  { status: 'LEAD', label: 'Lead', variant: 'default' as const },
  { status: 'PROSPECT', label: 'Prospect', variant: 'warning' as const },
  { status: 'ACTIVE', label: 'Attivo', variant: 'success' as const },
  { status: 'INACTIVE', label: 'Inattivo', variant: 'outline' as const },
  { status: 'CHURNED', label: 'Perso', variant: 'destructive' as const },
]

export default function PipelinePage() {
  const router = useRouter()
  const [clientsByStatus, setClientsByStatus] = useState<Record<string, Client[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/clients?limit=200')
        if (res.ok) {
          const data = await res.json()
          const grouped: Record<string, Client[]> = {}
          for (const col of COLUMNS) grouped[col.status] = []
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pipeline Commerciale</h1>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <div key={col.status} className="flex-shrink-0 w-64">
              <Skeleton className="h-8 w-full mb-3" />
              <Skeleton className="h-24 w-full mb-2" />
              <Skeleton className="h-24 w-full mb-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const clients = clientsByStatus[col.status] || []
            return (
              <div
                key={col.status}
                className="flex-shrink-0 w-72 bg-secondary/30 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={col.variant}>{col.label}</Badge>
                  </div>
                  <span className="text-xs text-muted font-medium bg-secondary rounded-full px-2 py-0.5">
                    {clients.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => router.push(`/crm/${client.id}`)}
                      className="bg-card rounded-md border border-border p-3 cursor-pointer hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar name={client.companyName} size="sm" />
                        <span className="font-medium text-sm truncate">
                          {client.companyName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>{client.industry || 'N/D'}</span>
                        <span className="font-medium">{formatCurrency(client.totalRevenue)}</span>
                      </div>
                    </div>
                  ))}
                  {clients.length === 0 && (
                    <p className="text-xs text-muted text-center py-4">Nessun cliente</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
