'use client'

import { useFetch } from '@/hooks/useFetch'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { Briefcase, Calendar, Trophy, TrendingUp, Package, Sparkles } from 'lucide-react'

interface TimelineItem {
  date: string
  type: 'creation' | 'deal' | 'project' | 'revenue' | 'service'
  title: string
  detail?: string
  value?: string
}

interface ClientServiceData {
  id: string
  status: string
  startDate: string | null
  value: string | null
  createdAt: string
  service: { name: string; category: string }
}

interface DealData {
  id: string
  title: string
  stage: string
  value: string | number
  createdAt: string
}

interface CrossSellData {
  serviceId: string
  serviceName: string
  reason: string
  confidence: string
  suggestedApproach: string
}

const ICON_MAP = {
  creation: Calendar,
  deal: Trophy,
  project: Briefcase,
  revenue: TrendingUp,
  service: Package,
}

const COLOR_MAP = {
  creation: 'bg-blue-500/10 text-blue-500',
  deal: 'bg-amber-500/10 text-amber-500',
  project: 'bg-indigo-500/10 text-indigo-500',
  revenue: 'bg-green-500/10 text-green-500',
  service: 'bg-purple-500/10 text-purple-500',
}

export function ClientSuccessTimeline({ clientId, clientData }: {
  clientId: string
  clientData: { createdAt: string; totalRevenue: string | number }
}) {
  const { data: servicesRaw } = useFetch<{ success: boolean; data: ClientServiceData[] }>(`/api/clients/${clientId}/services`)
  const { data: dealsRaw } = useFetch<{ success: boolean; data?: DealData[]; items?: DealData[] }>(`/api/deals?clientId=${clientId}&limit=20`)
  const { data: crossSellRaw, loading: crossSellLoading } = useFetch<{ success: boolean; data: CrossSellData[] }>(`/api/clients/${clientId}/cross-sell`)

  const services = servicesRaw?.success ? servicesRaw.data : []
  const deals = dealsRaw?.success ? (dealsRaw.data || dealsRaw.items || []) : []
  const crossSell = crossSellRaw?.success ? crossSellRaw.data : []

  const timeline = buildTimeline(clientData, services, deals)

  return (
    <div className="space-y-4">
      <TimelineCard timeline={timeline} />
      <CrossSellCard crossSell={crossSell} loading={crossSellLoading} />
    </div>
  )
}

function TimelineCard({ timeline }: { timeline: TimelineItem[] }) {
  return (
    <Card>
      <CardContent>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          Success Timeline
        </h3>
        {timeline.length === 0 ? (
          <p className="text-xs text-muted">Nessun evento disponibile.</p>
        ) : (
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
            {timeline.map((item, idx) => {
              const Icon = ICON_MAP[item.type]
              const color = COLOR_MAP[item.type]
              return (
                <div key={idx} className="relative flex gap-3">
                  <div className={`absolute -left-3.5 flex items-center justify-center h-5 w-5 rounded-full ${color}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{item.title}</p>
                      <span className="text-xs text-muted flex-shrink-0">
                        {new Date(item.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {item.detail && <p className="text-xs text-muted mt-0.5">{item.detail}</p>}
                    {item.value && <p className="text-xs font-medium text-emerald-500 mt-0.5">{item.value}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CrossSellCard({ crossSell, loading }: { crossSell: CrossSellData[]; loading: boolean }) {
  return (
    <Card>
      <CardContent>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Suggerimenti Cross-sell
        </h3>
        {loading ? (
          <p className="text-xs text-muted">Analisi in corso...</p>
        ) : crossSell.length === 0 ? (
          <p className="text-xs text-muted">Nessun suggerimento disponibile. Aggiungi servizi al catalogo per attivare il cross-sell.</p>
        ) : (
          <div className="space-y-3">
            {crossSell.map((item) => (
              <div key={item.serviceId} className="p-3 rounded-lg bg-muted/10 border border-border/30">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{item.serviceName}</p>
                  <Badge variant={item.confidence === 'HIGH' ? 'success' : item.confidence === 'MEDIUM' ? 'warning' : 'outline'}>
                    {item.confidence}
                  </Badge>
                </div>
                <p className="text-xs text-muted">{item.reason}</p>
                <p className="text-xs text-blue-500 mt-1">{item.suggestedApproach}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function buildTimeline(
  clientData: { createdAt: string; totalRevenue: string | number },
  services: ClientServiceData[],
  deals: DealData[],
): TimelineItem[] {
  const items: TimelineItem[] = []

  items.push({ date: clientData.createdAt, type: 'creation', title: 'Primo contatto' })

  for (const deal of deals) {
    items.push({
      date: deal.createdAt,
      type: 'deal',
      title: deal.title,
      detail: deal.stage,
      value: formatCurrency(deal.value),
    })
  }

  for (const cs of services) {
    items.push({
      date: cs.startDate || cs.createdAt,
      type: 'service',
      title: `Servizio: ${cs.service.name}`,
      detail: cs.service.category,
      value: cs.value ? formatCurrency(cs.value) : undefined,
    })
  }

  const revenue = parseFloat(String(clientData.totalRevenue))
  const milestones = [1000, 5000, 10000, 25000, 50000, 100000]
  for (const m of milestones) {
    if (revenue >= m) {
      items.push({
        date: clientData.createdAt,
        type: 'revenue',
        title: `Milestone Revenue: ${formatCurrency(m)}`,
      })
    }
  }

  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return items
}
