'use client'

import { useState, useCallback } from 'react'
import { useFetch } from '@/hooks/useFetch'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { formatCurrency } from '@/lib/utils'
import {
  Calendar, Trophy, TrendingUp, Package, Sparkles,
  Plus, Loader2,
} from 'lucide-react'

// --- Types ---

interface ClientServiceData {
  id: string
  status: string
  startDate: string | null
  value: string | null
  notes: string | null
  createdAt: string
  service: { id: string; name: string; category: string; description: string | null }
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

interface CatalogService {
  id: string
  name: string
  category: string
  description: string | null
  priceType: string
  priceMin: string | null
  priceMax: string | null
}

interface TimelineItem {
  date: string
  type: 'creation' | 'deal' | 'service' | 'revenue'
  title: string
  detail?: string
  value?: string
}

// --- Constants ---

const ICON_MAP = {
  creation: Calendar,
  deal: Trophy,
  service: Package,
  revenue: TrendingUp,
}

const COLOR_MAP = {
  creation: 'bg-blue-500/10 text-blue-500',
  deal: 'bg-amber-500/10 text-amber-500',
  service: 'bg-purple-500/10 text-purple-500',
  revenue: 'bg-green-500/10 text-green-500',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Attivo',
  COMPLETED: 'Completato',
  CANCELLED: 'Annullato',
  PAUSED: 'In pausa',
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  ACTIVE: 'success',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
  PAUSED: 'warning',
}

const CONFIDENCE_LABELS: Record<string, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Bassa',
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Attivo' },
  { value: 'PAUSED', label: 'In pausa' },
  { value: 'COMPLETED', label: 'Completato' },
]

// --- Main Component ---

export function ClientSuccessTimeline({ clientId, clientData }: {
  clientId: string
  clientData: { createdAt: string; totalRevenue: string | number }
}) {
  const { data: servicesRaw, refetch: refetchServices } = useFetch<{ success: boolean; data: ClientServiceData[] }>(`/api/clients/${clientId}/services`)
  const { data: dealsRaw } = useFetch<{ success: boolean; data?: DealData[]; items?: DealData[] }>(`/api/deals?clientId=${clientId}&limit=20`)
  const { data: crossSellRaw, loading: crossSellLoading } = useFetch<{ success: boolean; data: CrossSellData[] }>(`/api/clients/${clientId}/cross-sell`)

  const services = servicesRaw?.success ? servicesRaw.data : []
  const deals = dealsRaw?.success ? (dealsRaw.data || dealsRaw.items || []) : []
  const crossSell = crossSellRaw?.success ? crossSellRaw.data : []

  const activeServices = services.filter(s => s.status === 'ACTIVE')
  const otherServices = services.filter(s => s.status !== 'ACTIVE')
  const totalValue = services.reduce((sum, s) => sum + (parseFloat(s.value || '0') || 0), 0)

  const timeline = buildTimeline(clientData, services, deals)

  return (
    <div className="space-y-4">
      {/* KPI servizi */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Servizi Attivi" value={String(activeServices.length)} color="text-emerald-500" />
        <KpiCard label="Totale Servizi" value={String(services.length)} color="text-blue-500" />
        <KpiCard label="Valore Mensile" value={formatCurrency(totalValue)} color="text-amber-500" />
        <KpiCard label="Trattative" value={String(deals.length)} color="text-indigo-500" />
      </div>

      {/* Servizi attivi */}
      <ActiveServicesCard
        services={activeServices}
        clientId={clientId}
        onServiceAdded={refetchServices}
      />

      {/* Servizi passati */}
      {otherServices.length > 0 && (
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-muted" />
              Storico Servizi
            </h3>
            <div className="space-y-2">
              {otherServices.map(s => (
                <ServiceRow key={s.id} service={s} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggerimenti AI */}
      <CrossSellCard crossSell={crossSell} loading={crossSellLoading} />

      {/* Percorso cliente */}
      <TimelineCard timeline={timeline} />
    </div>
  )
}

// --- Sub-components ---

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border/40 rounded-lg p-3">
      <p className="text-[10px] md:text-xs text-muted mb-0.5">{label}</p>
      <p className={`text-base md:text-lg font-bold ${color} tabular-nums`}>{value}</p>
    </div>
  )
}

function ServiceRow({ service }: { service: ClientServiceData }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-muted/5 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium truncate">{service.service.name}</p>
          <Badge variant={STATUS_VARIANTS[service.status] || 'outline'} className="text-[10px]">
            {STATUS_LABELS[service.status] || service.status}
          </Badge>
        </div>
        <p className="text-xs text-muted">
          {service.service.category}
          {service.startDate && ` \u00b7 Dal ${new Date(service.startDate).toLocaleDateString('it-IT')}`}
        </p>
        {service.notes && <p className="text-xs text-muted/70 mt-0.5">{service.notes}</p>}
      </div>
      {service.value && (
        <p className="text-sm font-semibold text-emerald-500 flex-shrink-0 ml-3">
          {formatCurrency(service.value)}
        </p>
      )}
    </div>
  )
}

function ActiveServicesCard({
  services,
  clientId,
  onServiceAdded,
}: {
  services: ClientServiceData[]
  clientId: string
  onServiceAdded: () => void
}) {
  const [showAddModal, setShowAddModal] = useState(false)
  const handleOpenAdd = useCallback(() => setShowAddModal(true), [])
  const handleCloseAdd = useCallback(() => setShowAddModal(false), [])

  const handleAdded = useCallback(() => {
    setShowAddModal(false)
    onServiceAdded()
  }, [onServiceAdded])

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-500" />
              Servizi Attivi
            </h3>
            <Button variant="outline" size="sm" onClick={handleOpenAdd} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Assegna Servizio
            </Button>
          </div>
          {services.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">
              Nessun servizio attivo. Assegna un servizio dal catalogo per iniziare.
            </p>
          ) : (
            <div className="space-y-2">
              {services.map(s => (
                <ServiceRow key={s.id} service={s} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <AddServiceModal
        open={showAddModal}
        onClose={handleCloseAdd}
        clientId={clientId}
        existingServiceIds={services.map(s => s.service.id)}
        onAdded={handleAdded}
      />
    </>
  )
}

function AddServiceModal({
  open,
  onClose,
  clientId,
  existingServiceIds,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  clientId: string
  existingServiceIds: string[]
  onAdded: () => void
}) {
  const { data: catalogRaw } = useFetch<{ success: boolean; data: CatalogService[] }>(open ? '/api/crm/services' : null)
  const catalog = catalogRaw?.success ? catalogRaw.data : []
  const available = catalog.filter(s => !existingServiceIds.includes(s.id))

  const [serviceId, setServiceId] = useState('')
  const [value, setValue] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const selected = available.find(s => s.id === serviceId)

  const handleServiceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setServiceId(e.target.value)
    const svc = available.find(s => s.id === e.target.value)
    if (svc?.priceMin) setValue(svc.priceMin)
  }, [available])

  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value), [])
  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value), [])
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), [])

  const handleSave = useCallback(async () => {
    if (!serviceId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          status,
          value: value || null,
          notes: notes || null,
          startDate: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (data.success) onAdded()
    } finally {
      setSaving(false)
    }
  }, [serviceId, status, value, notes, clientId, onAdded])

  return (
    <Modal open={open} onClose={onClose} title="Assegna Servizio" size="md">
      <div className="space-y-4">
        {available.length === 0 ? (
          <p className="text-sm text-muted py-4 text-center">
            Tutti i servizi del catalogo sono già assegnati a questo cliente, oppure il catalogo è vuoto.
          </p>
        ) : (
          <>
            <Select
              label="Servizio"
              options={available.map(s => ({ value: s.id, label: `${s.name} (${s.category})` }))}
              value={serviceId}
              onChange={handleServiceChange}
            />
            {selected && (
              <div className="rounded-lg bg-muted/10 border border-border/30 p-3">
                <p className="text-sm font-medium">{selected.name}</p>
                {selected.description && <p className="text-xs text-muted mt-1">{selected.description}</p>}
                <p className="text-xs text-muted mt-1">
                  Prezzo: {selected.priceMin
                    ? `€${selected.priceMin}${selected.priceMax ? ` - €${selected.priceMax}` : ''}`
                    : 'Su preventivo'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Select label="Stato" options={STATUS_OPTIONS} value={status} onChange={handleStatusChange} />
              <div>
                <label className="text-sm font-medium mb-1.5 block">Valore (€)</label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  value={value}
                  onChange={handleValueChange}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Note</label>
              <textarea
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[60px]"
                value={notes}
                onChange={handleNotesChange}
                placeholder="Note opzionali sul servizio..."
              />
            </div>
            <Button onClick={handleSave} disabled={!serviceId || saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
              Assegna
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}

function CrossSellCard({ crossSell, loading }: { crossSell: CrossSellData[]; loading: boolean }) {
  return (
    <Card>
      <CardContent>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Servizi Consigliati dall&apos;AI
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 text-muted py-4 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Analisi in corso...</span>
          </div>
        ) : crossSell.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">
            Nessun suggerimento disponibile. Aggiungi servizi al catalogo per attivare i consigli automatici.
          </p>
        ) : (
          <div className="space-y-3">
            {crossSell.map((item) => (
              <div key={item.serviceId} className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium">{item.serviceName}</p>
                  <Badge variant={item.confidence === 'HIGH' ? 'success' : item.confidence === 'MEDIUM' ? 'warning' : 'outline'}>
                    {CONFIDENCE_LABELS[item.confidence] || item.confidence}
                  </Badge>
                </div>
                <p className="text-xs text-muted leading-relaxed">{item.reason}</p>
                <p className="text-xs text-purple-500 mt-1.5 font-medium">{item.suggestedApproach}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TimelineCard({ timeline }: { timeline: TimelineItem[] }) {
  if (timeline.length <= 1) return null

  return (
    <Card>
      <CardContent>
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-500" />
          Percorso Cliente
        </h3>
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
      </CardContent>
    </Card>
  )
}

// --- Timeline builder ---

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
      items.push({ date: clientData.createdAt, type: 'revenue', title: `Traguardo fatturato: ${formatCurrency(m)}` })
    }
  }

  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  return items
}
