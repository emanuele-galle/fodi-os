'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Edit, Plus, Phone, Mail, MessageSquare,
  Calendar, FileText, Users, Building2, Globe, Hash
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  role: string | null
  isPrimary: boolean
}

interface Interaction {
  id: string
  type: string
  subject: string
  content: string | null
  date: string
}

interface ClientProject {
  id: string
  name: string
  status: string
  priority: string
}

interface ClientQuote {
  id: string
  number: string
  title: string
  status: string
  total: string
}

interface ClientDetail {
  id: string
  companyName: string
  slug: string
  vatNumber: string | null
  fiscalCode: string | null
  pec: string | null
  sdi: string | null
  website: string | null
  industry: string | null
  source: string | null
  status: string
  notes: string | null
  tags: string[]
  totalRevenue: string
  createdAt: string
  contacts: Contact[]
  interactions: Interaction[]
  projects: ClientProject[]
  quotes: ClientQuote[]
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LEAD: 'default', PROSPECT: 'warning', ACTIVE: 'success', INACTIVE: 'outline', CHURNED: 'destructive',
}
const STATUS_LABELS: Record<string, string> = {
  LEAD: 'Lead', PROSPECT: 'Prospect', ACTIVE: 'Attivo', INACTIVE: 'Inattivo', CHURNED: 'Perso',
}
const PROJECT_STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  PLANNING: 'default', IN_PROGRESS: 'success', ON_HOLD: 'warning', REVIEW: 'default', COMPLETED: 'outline', CANCELLED: 'destructive',
}
const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'default', HIGH: 'warning', URGENT: 'destructive',
}
const QUOTE_STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  DRAFT: 'default', SENT: 'default', APPROVED: 'success', REJECTED: 'destructive', EXPIRED: 'outline', INVOICED: 'warning',
}

const INTERACTION_ICONS: Record<string, typeof Phone> = {
  CALL: Phone, EMAIL: Mail, MEETING: Calendar, NOTE: FileText, WHATSAPP: MessageSquare, SOCIAL: Globe,
}

const INTERACTION_TYPES = [
  { value: 'CALL', label: 'Chiamata' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Riunione' },
  { value: 'NOTE', label: 'Nota' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SOCIAL', label: 'Social' },
]

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [interactionModalOpen, setInteractionModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setClient(data)
      }
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  async function handleAddContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = { clientId }
    form.forEach((v, k) => {
      if (k === 'isPrimary') {
        body[k] = v === 'on'
      } else if (typeof v === 'string' && v.trim()) {
        body[k] = v.trim()
      }
    })
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setContactModalOpen(false)
        fetchClient()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddInteraction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const form = new FormData(e.currentTarget)
    const body: Record<string, string> = { clientId }
    form.forEach((v, k) => {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    })
    try {
      const res = await fetch(`/api/clients/${clientId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setInteractionModalOpen(false)
        fetchClient()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Cliente non trovato.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/crm')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
      </div>
    )
  }

  const overviewTab = (
    <Card>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow icon={Hash} label="P.IVA" value={client.vatNumber} />
          <InfoRow icon={Mail} label="PEC" value={client.pec} />
          <InfoRow icon={Hash} label="Codice SDI" value={client.sdi} />
          <InfoRow icon={Globe} label="Sito Web" value={client.website} />
          <InfoRow icon={Building2} label="Settore" value={client.industry} />
          <InfoRow icon={Users} label="Fonte" value={client.source} />
        </div>
        {client.tags.length > 0 && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {client.tags.map((tag) => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>
        )}
        {client.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm font-medium mb-1">Note</p>
            <p className="text-sm text-muted whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm text-muted">
          <span>Revenue totale: <strong className="text-foreground">{formatCurrency(client.totalRevenue)}</strong></span>
          <span>Creato il {new Date(client.createdAt).toLocaleDateString('it-IT')}</span>
        </div>
      </CardContent>
    </Card>
  )

  const contactsTab = (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setContactModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Contatto
        </Button>
      </div>
      {client.contacts.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Nessun contatto registrato.</p>
      ) : (
        <div className="space-y-3">
          {client.contacts.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center gap-4">
                <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.firstName} {c.lastName}</span>
                    {c.isPrimary && <Badge variant="success">Principale</Badge>}
                    {c.role && <span className="text-xs text-muted">- {c.role}</span>}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted mt-1">
                    {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const interactionsTab = (
    <div>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setInteractionModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuova Interazione
        </Button>
      </div>
      {client.interactions.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Nessuna interazione registrata.</p>
      ) : (
        <div className="relative border-l-2 border-border ml-4 space-y-4">
          {client.interactions.map((i) => {
            const Icon = INTERACTION_ICONS[i.type] || FileText
            return (
              <div key={i.id} className="relative pl-6">
                <div className="absolute -left-2.5 top-1 h-5 w-5 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                  <Icon className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{i.subject}</span>
                    <span className="text-xs text-muted">
                      {new Date(i.date).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  {i.content && (
                    <p className="text-sm text-muted line-clamp-2">{i.content}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const projectsTab = (
    <div>
      {client.projects.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Nessun progetto collegato.</p>
      ) : (
        <div className="space-y-3">
          {client.projects.map((p) => (
            <Card
              key={p.id}
              className="cursor-pointer shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200"
              onClick={() => router.push(`/projects/${p.id}`)}
            >
              <CardContent className="flex items-center justify-between">
                <span className="font-medium text-sm">{p.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={PROJECT_STATUS_BADGE[p.status] || 'default'}>{p.status}</Badge>
                  <Badge variant={PRIORITY_BADGE[p.priority] || 'default'}>{p.priority}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const quotesTab = (
    <div>
      {client.quotes.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Nessun preventivo collegato.</p>
      ) : (
        <div className="space-y-3">
          {client.quotes.map((q) => (
            <Card
              key={q.id}
              className="cursor-pointer shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200"
              onClick={() => router.push(`/erp/quotes/${q.id}`)}
            >
              <CardContent className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{q.number}</span>
                  <span className="text-muted text-sm ml-2">{q.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={QUOTE_STATUS_BADGE[q.status] || 'default'}>{q.status}</Badge>
                  <span className="font-medium text-sm">{formatCurrency(q.total)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <button
        onClick={() => router.push('/crm')}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Torna alla lista clienti
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Avatar name={client.companyName} size="lg" />
          <div>
            <h1 className="text-2xl font-semibold">{client.companyName}</h1>
            <Badge variant={STATUS_BADGE[client.status] || 'default'}>
              {STATUS_LABELS[client.status] || client.status}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Modifica
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Panoramica', content: overviewTab },
          { id: 'contacts', label: 'Contatti', content: contactsTab },
          { id: 'interactions', label: 'Interazioni', content: interactionsTab },
          { id: 'projects', label: 'Progetti', content: projectsTab },
          { id: 'quotes', label: 'Preventivi', content: quotesTab },
        ]}
      />

      <Modal open={contactModalOpen} onClose={() => setContactModalOpen(false)} title="Aggiungi Contatto" size="md">
        <form onSubmit={handleAddContact} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input name="firstName" label="Nome *" required />
            <Input name="lastName" label="Cognome *" required />
          </div>
          <Input name="email" label="Email" type="email" />
          <Input name="phone" label="Telefono" />
          <Input name="role" label="Ruolo" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPrimary" className="rounded border-border" />
            Contatto principale
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setContactModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Salvataggio...' : 'Aggiungi'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={interactionModalOpen} onClose={() => setInteractionModalOpen(false)} title="Nuova Interazione" size="md">
        <form onSubmit={handleAddInteraction} className="space-y-4">
          <Select name="type" label="Tipo *" options={INTERACTION_TYPES} />
          <Input name="subject" label="Oggetto *" required />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Contenuto</label>
            <textarea
              name="content"
              rows={4}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setInteractionModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Salvataggio...' : 'Aggiungi'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3 text-sm py-1.5">
      <div className="p-1.5 rounded-md bg-secondary/50 text-muted flex-shrink-0">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-muted min-w-[60px]">{label}:</span>
      <span className="font-medium truncate">{value || '—'}</span>
    </div>
  )
}
