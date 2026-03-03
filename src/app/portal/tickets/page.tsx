'use client'
/* eslint-disable react-perf/jsx-no-new-function-as-prop -- event handlers */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Ticket, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'

interface TicketItem {
  id: string
  number: string
  subject: string
  status: string
  priority: string
  category: string
  createdAt: string
  updatedAt: string
  _count: { comments: number }
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aperto',
  IN_PROGRESS: 'In lavorazione',
  WAITING_CLIENT: 'Risposta richiesta',
  RESOLVED: 'Risolto',
  CLOSED: 'Chiuso',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
}

const STATUS_TABS = [
  { label: 'Tutti', value: '' },
  { label: 'Aperti', value: 'OPEN,IN_PROGRESS,WAITING_CLIENT' },
  { label: 'Risolti', value: 'RESOLVED,CLOSED' },
]

export default function PortalTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('')

  const fetchTickets = useCallback(() => {
    setLoading(true)
    const url = activeTab
      ? `/api/portal/tickets?status=${activeTab}`
      : '/api/portal/tickets'
    fetch(url)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setTickets(data.items || []))
      .finally(() => setLoading(false))
  }, [activeTab])

  useEffect(() => {
    fetchTickets() // eslint-disable-line react-hooks/set-state-in-effect -- loading state set inside fetch callback, not a cascading render risk
  }, [fetchTickets])

  useRealtimeRefresh('ticket', fetchTickets)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ticket</h1>
          <p className="text-sm text-muted mt-1">Le tue richieste di assistenza</p>
        </div>
        <Button onClick={() => router.push('/portal/tickets/new')}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nuovo Ticket
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-secondary/50 rounded-lg w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Nessun ticket"
          description="Non hai ancora aperto ticket di assistenza."
          action={
            <Button onClick={() => router.push('/portal/tickets/new')}>
              <Plus className="h-4 w-4 mr-1.5" />
              Apri il tuo primo ticket
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => router.push(`/portal/tickets/${ticket.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{ticket.number}</span>
                    <Badge status={ticket.status} className="text-[10px]">
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </Badge>
                    {ticket.status === 'WAITING_CLIENT' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                        Richiesta risposta
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{ticket.subject}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{new Date(ticket.createdAt).toLocaleDateString('it-IT')}</span>
                    <Badge status={ticket.priority} className="text-[10px]">
                      {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                    </Badge>
                    {ticket._count.comments > 0 && (
                      <span>{ticket._count.comments} rispost{ticket._count.comments === 1 ? 'a' : 'e'}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
