'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Edit, Plus, Phone, Mail, MessageSquare,
  Calendar, FileText, Users, Building2, Globe, Hash, FolderKanban, Trash2,
  CheckSquare, TrendingUp, Paperclip, Clock, Upload, ExternalLink, AlertCircle
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
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import {
  STATUS_LABELS, PRIORITY_BADGE, INTERACTION_ICONS, INTERACTION_TYPES,
  STATUS_OPTIONS, INDUSTRY_OPTIONS, SOURCE_OPTIONS
} from '@/lib/crm-constants'

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
  contactId: string | null
  contact: { id: string; firstName: string; lastName: string } | null
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

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.clientId as string

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [interactionModalOpen, setInteractionModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Edit/delete modals
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [editContactId, setEditContactId] = useState<string | null>(null)
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null)
  const [editInteractionId, setEditInteractionId] = useState<string | null>(null)
  const [deleteInteractionId, setDeleteInteractionId] = useState<string | null>(null)

  // Form state for client edit
  const [editForm, setEditForm] = useState({
    companyName: '', vatNumber: '', fiscalCode: '', pec: '', sdi: '',
    website: '', industry: '', source: '', status: '', notes: '', tags: ''
  })

  // Form state for contact edit
  const [editContactForm, setEditContactForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', role: '', isPrimary: false, notes: ''
  })

  // Form state for interaction edit
  const [editInteractionForm, setEditInteractionForm] = useState({
    type: '', subject: '', content: '', contactId: '', date: ''
  })

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setClient(data)
        setEditForm({
          companyName: data.companyName || '',
          vatNumber: data.vatNumber || '',
          fiscalCode: data.fiscalCode || '',
          pec: data.pec || '',
          sdi: data.sdi || '',
          website: data.website || '',
          industry: data.industry || '',
          source: data.source || '',
          status: data.status || '',
          notes: data.notes || '',
          tags: (data.tags || []).join(', ')
        })
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

  async function handleEditClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const body: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editForm)) {
      if (k === 'tags') {
        body.tags = (v as string).split(',').map(t => t.trim()).filter(Boolean)
      } else if (typeof v === 'string') {
        body[k] = v.trim() || null
      }
    }
    // companyName must not be null
    if (editForm.companyName.trim()) body.companyName = editForm.companyName.trim()
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setEditModalOpen(false)
        fetchClient()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteClient() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' })
      if (res.ok) router.push('/crm')
    } finally {
      setSubmitting(false)
    }
  }

  function openEditContact(contact: Contact) {
    setEditContactId(contact.id)
    setEditContactForm({
      firstName: contact.firstName, lastName: contact.lastName,
      email: contact.email || '', phone: contact.phone || '',
      role: contact.role || '', isPrimary: contact.isPrimary,
      notes: (contact as Contact & { notes?: string | null }).notes || ''
    })
  }

  function openEditInteraction(interaction: Interaction) {
    setEditInteractionId(interaction.id)
    setEditInteractionForm({
      type: interaction.type,
      subject: interaction.subject,
      content: interaction.content || '',
      contactId: interaction.contactId || '',
      date: interaction.date ? new Date(interaction.date).toISOString().slice(0, 16) : '',
    })
  }

  async function handleEditInteraction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editInteractionId) return
    setSubmitting(true)
    const body: Record<string, unknown> = {}
    if (editInteractionForm.type) body.type = editInteractionForm.type
    if (editInteractionForm.subject.trim()) body.subject = editInteractionForm.subject.trim()
    body.content = editInteractionForm.content.trim() || null
    body.contactId = editInteractionForm.contactId || null
    if (editInteractionForm.date) body.date = new Date(editInteractionForm.date).toISOString()
    try {
      const res = await fetch(`/api/clients/${clientId}/interactions/${editInteractionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) { setEditInteractionId(null); fetchClient() }
    } finally { setSubmitting(false) }
  }

  async function handleDeleteInteraction() {
    if (!deleteInteractionId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/interactions/${deleteInteractionId}`, { method: 'DELETE' })
      if (res.ok) { setDeleteInteractionId(null); fetchClient() }
    } finally { setSubmitting(false) }
  }

  async function handleEditContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editContactId) return
    setSubmitting(true)
    const body: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editContactForm)) {
      if (k === 'isPrimary') body[k] = v
      else if (k === 'notes') body[k] = (v as string).trim() || null
      else if (typeof v === 'string') body[k] = v.trim() || null
    }
    if (editContactForm.firstName.trim()) body.firstName = editContactForm.firstName.trim()
    if (editContactForm.lastName.trim()) body.lastName = editContactForm.lastName.trim()
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts/${editContactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) { setEditContactId(null); fetchClient() }
    } finally { setSubmitting(false) }
  }

  async function handleDeleteContact() {
    if (!deleteContactId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts/${deleteContactId}`, { method: 'DELETE' })
      if (res.ok) { setDeleteContactId(null); fetchClient() }
    } finally { setSubmitting(false) }
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
        <EmptyState
          icon={Users}
          title="Nessun contatto registrato"
          description="Aggiungi i contatti principali di questa azienda."
          action={
            <Button size="sm" onClick={() => setContactModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Contatto
            </Button>
          }
        />
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
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEditContact(c)} className="p-1.5 rounded-md hover:bg-secondary/50 text-muted hover:text-foreground transition-colors" title="Modifica">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteContactId(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted hover:text-destructive transition-colors" title="Elimina">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
        <EmptyState
          icon={MessageSquare}
          title="Nessuna interazione registrata"
          description="Registra chiamate, email e incontri con questo cliente."
          action={
            <Button size="sm" onClick={() => setInteractionModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Interazione
            </Button>
          }
        />
      ) : (
        <div className="relative border-l-2 border-border ml-4 space-y-4">
          {client.interactions.map((i) => {
            const Icon = INTERACTION_ICONS[i.type] || FileText
            return (
              <div key={i.id} className="relative pl-6 group/interaction">
                <div className="absolute -left-2.5 top-1 h-5 w-5 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                  <Icon className="h-3 w-3 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{i.subject}</span>
                      {i.contact && (
                        <span className="text-xs text-muted flex items-center gap-1 flex-shrink-0">
                          <Users className="h-3 w-3" />
                          {i.contact.firstName} {i.contact.lastName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-muted">
                        {new Date(i.date).toLocaleDateString('it-IT')}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/interaction:opacity-100 transition-opacity ml-1">
                        <button onClick={() => openEditInteraction(i)} className="p-1 rounded-md hover:bg-secondary/50 text-muted hover:text-foreground transition-colors" title="Modifica">
                          <Edit className="h-3 w-3" />
                        </button>
                        <button onClick={() => setDeleteInteractionId(i.id)} className="p-1 rounded-md hover:bg-destructive/10 text-muted hover:text-destructive transition-colors" title="Elimina">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
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
        <EmptyState
          icon={FolderKanban}
          title="Nessun progetto collegato"
          description="I progetti associati a questo cliente appariranno qui."
        />
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
                  <Badge status={p.status}>{p.status}</Badge>
                  <Badge status={p.priority}>{p.priority}</Badge>
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
        <EmptyState
          icon={FileText}
          title="Nessun preventivo collegato"
          description="I preventivi di questo cliente appariranno qui."
        />
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
                  <Badge status={q.status}>{q.status}</Badge>
                  <span className="font-medium text-sm">{formatCurrency(q.total)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  const tasksTab = <ClientTasksTab clientId={clientId as string} />
  const dealsTab = <ClientDealsTab clientId={clientId as string} />
  const documentsTab = <ClientDocumentsTab clientId={clientId as string} />
  const timelineTab = <ClientTimelineTab clientId={clientId as string} />

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
            <h1 className="text-xl md:text-2xl font-semibold truncate">{client.companyName}</h1>
            <Badge status={client.status}>
              {STATUS_LABELS[client.status] || client.status}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Panoramica', content: overviewTab },
          { id: 'contacts', label: 'Contatti', content: contactsTab },
          { id: 'interactions', label: 'Interazioni', content: interactionsTab },
          { id: 'tasks', label: 'Attività', content: tasksTab },
          { id: 'deals', label: 'Opportunità', content: dealsTab },
          { id: 'projects', label: 'Progetti', content: projectsTab },
          { id: 'quotes', label: 'Preventivi', content: quotesTab },
          { id: 'documents', label: 'Documenti', content: documentsTab },
          { id: 'timeline', label: 'Cronologia', content: timelineTab },
        ]}
      />

      {/* Add Contact Modal */}
      <Modal open={contactModalOpen} onClose={() => setContactModalOpen(false)} title="Aggiungi Contatto" size="md">
        <form onSubmit={handleAddContact} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input name="firstName" label="Nome *" required />
            <Input name="lastName" label="Cognome *" required />
          </div>
          <Input name="email" label="Email" type="email" />
          <Input name="phone" label="Telefono" />
          <Input name="role" label="Ruolo" />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Note</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Note sul contatto..."
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPrimary" className="rounded border-border" />
            Contatto principale
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setContactModalOpen(false)}>Annulla</Button>
            <Button type="submit" loading={submitting}>Aggiungi</Button>
          </div>
        </form>
      </Modal>

      {/* Add Interaction Modal */}
      <Modal open={interactionModalOpen} onClose={() => setInteractionModalOpen(false)} title="Nuova Interazione" size="md">
        <form onSubmit={handleAddInteraction} className="space-y-4">
          <Select name="type" label="Tipo *" options={INTERACTION_TYPES} />
          <Input name="subject" label="Oggetto *" required />
          {client.contacts.length > 0 && (
            <Select
              name="contactId"
              label="Contatto"
              options={[
                { value: '', label: 'Nessun contatto specifico' },
                ...client.contacts.map(c => ({ value: c.id, label: `${c.firstName} ${c.lastName}${c.role ? ` - ${c.role}` : ''}` }))
              ]}
            />
          )}
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
            <Button type="submit" loading={submitting}>Aggiungi</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Client Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Modifica Cliente" size="lg">
        <form onSubmit={handleEditClient} className="space-y-4">
          <Input label="Ragione Sociale *" required value={editForm.companyName} onChange={e => setEditForm(f => ({ ...f, companyName: e.target.value }))} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="P.IVA" value={editForm.vatNumber} onChange={e => setEditForm(f => ({ ...f, vatNumber: e.target.value }))} />
            <Input label="Codice Fiscale" value={editForm.fiscalCode} onChange={e => setEditForm(f => ({ ...f, fiscalCode: e.target.value }))} />
            <Input label="PEC" type="email" value={editForm.pec} onChange={e => setEditForm(f => ({ ...f, pec: e.target.value }))} />
            <Input label="Codice SDI" value={editForm.sdi} onChange={e => setEditForm(f => ({ ...f, sdi: e.target.value }))} />
            <Input label="Sito Web" value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} />
            <Input label="Tags (separati da virgola)" value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Settore" options={INDUSTRY_OPTIONS} value={editForm.industry} onChange={e => setEditForm(f => ({ ...f, industry: e.target.value }))} />
            <Select label="Fonte" options={SOURCE_OPTIONS} value={editForm.source} onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))} />
          </div>
          <Select label="Stato" options={STATUS_OPTIONS.filter(o => o.value !== '')} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Note</label>
            <textarea rows={3} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>Annulla</Button>
            <Button type="submit" loading={submitting}>Salva Modifiche</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Client Confirm Modal */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Elimina Cliente" size="sm">
        <p className="text-sm text-muted mb-4">
          Sei sicuro di voler eliminare <strong>{client.companyName}</strong>? Verranno eliminati tutti i contatti, interazioni e dati associati. Questa azione non può essere annullata.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Annulla</Button>
          <Button variant="destructive" onClick={handleDeleteClient} loading={submitting}>Elimina</Button>
        </div>
      </Modal>

      {/* Edit Contact Modal */}
      <Modal open={!!editContactId} onClose={() => setEditContactId(null)} title="Modifica Contatto" size="md">
        <form onSubmit={handleEditContact} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nome *" required value={editContactForm.firstName} onChange={e => setEditContactForm(f => ({ ...f, firstName: e.target.value }))} />
            <Input label="Cognome *" required value={editContactForm.lastName} onChange={e => setEditContactForm(f => ({ ...f, lastName: e.target.value }))} />
          </div>
          <Input label="Email" type="email" value={editContactForm.email} onChange={e => setEditContactForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Telefono" value={editContactForm.phone} onChange={e => setEditContactForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Ruolo" value={editContactForm.role} onChange={e => setEditContactForm(f => ({ ...f, role: e.target.value }))} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Note</label>
            <textarea
              rows={2}
              value={editContactForm.notes}
              onChange={e => setEditContactForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Note sul contatto..."
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={editContactForm.isPrimary} onChange={e => setEditContactForm(f => ({ ...f, isPrimary: e.target.checked }))} className="rounded border-border" />
            Contatto principale
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditContactId(null)}>Annulla</Button>
            <Button type="submit" loading={submitting}>Salva</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Contact Confirm Modal */}
      <Modal open={!!deleteContactId} onClose={() => setDeleteContactId(null)} title="Elimina Contatto" size="sm">
        <p className="text-sm text-muted mb-4">Sei sicuro di voler eliminare questo contatto? L&apos;azione non può essere annullata.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteContactId(null)}>Annulla</Button>
          <Button variant="destructive" onClick={handleDeleteContact} loading={submitting}>Elimina</Button>
        </div>
      </Modal>

      {/* Edit Interaction Modal */}
      <Modal open={!!editInteractionId} onClose={() => setEditInteractionId(null)} title="Modifica Interazione" size="md">
        <form onSubmit={handleEditInteraction} className="space-y-4">
          <Select
            label="Tipo *"
            options={INTERACTION_TYPES}
            value={editInteractionForm.type}
            onChange={e => setEditInteractionForm(f => ({ ...f, type: e.target.value }))}
          />
          <Input
            label="Oggetto *"
            required
            value={editInteractionForm.subject}
            onChange={e => setEditInteractionForm(f => ({ ...f, subject: e.target.value }))}
          />
          {client.contacts.length > 0 && (
            <Select
              label="Contatto"
              options={[
                { value: '', label: 'Nessun contatto specifico' },
                ...client.contacts.map(c => ({ value: c.id, label: `${c.firstName} ${c.lastName}${c.role ? ` - ${c.role}` : ''}` }))
              ]}
              value={editInteractionForm.contactId}
              onChange={e => setEditInteractionForm(f => ({ ...f, contactId: e.target.value }))}
            />
          )}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">Contenuto</label>
            <textarea
              rows={4}
              value={editInteractionForm.content}
              onChange={e => setEditInteractionForm(f => ({ ...f, content: e.target.value }))}
              className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </div>
          <Input
            label="Data"
            type="datetime-local"
            value={editInteractionForm.date}
            onChange={e => setEditInteractionForm(f => ({ ...f, date: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditInteractionId(null)}>Annulla</Button>
            <Button type="submit" loading={submitting}>Salva</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Interaction Confirm Modal */}
      <Modal open={!!deleteInteractionId} onClose={() => setDeleteInteractionId(null)} title="Elimina Interazione" size="sm">
        <p className="text-sm text-muted mb-4">Sei sicuro di voler eliminare questa interazione? L&apos;azione non può essere annullata.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteInteractionId(null)}>Annulla</Button>
          <Button variant="destructive" onClick={handleDeleteInteraction} loading={submitting}>Elimina</Button>
        </div>
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

/* ============ CLIENT TASKS TAB ============ */
function ClientTasksTab({ clientId }: { clientId: string }) {
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string; priority: string; dueDate: string | null; assignee?: { firstName: string; lastName: string } | null }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tasks?clientId=${clientId}&limit=50`)
      .then(r => r.json())
      .then(data => setTasks(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
  if (tasks.length === 0) return <EmptyState icon={CheckSquare} title="Nessuna attività" description="Le attività collegate a questo cliente appariranno qui." action={<Button size="sm" onClick={() => window.location.href = '/crm/tasks'}><Plus className="h-4 w-4 mr-1" />Crea Attività</Button>} />

  const PRIORITY_COLORS: Record<string, string> = { URGENT: 'text-red-600', HIGH: 'text-orange-500', MEDIUM: 'text-yellow-600', LOW: 'text-muted' }
  return (
    <div className="space-y-2">
      {tasks.map(t => (
        <Card key={t.id} className="!p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${t.status === 'DONE' ? 'bg-emerald-500' : t.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-muted'}`} />
              <span className={`text-sm font-medium truncate ${t.status === 'DONE' ? 'line-through text-muted' : ''}`}>{t.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {t.dueDate && (
                <span className={`text-xs ${new Date(t.dueDate) < new Date() && t.status !== 'DONE' ? 'text-destructive font-medium' : 'text-muted'}`}>
                  {new Date(t.dueDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </span>
              )}
              <span className={`text-xs font-medium ${PRIORITY_COLORS[t.priority] || 'text-muted'}`}>{t.priority}</span>
              <Badge status={t.status}>{t.status}</Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

/* ============ CLIENT DEALS TAB ============ */
function ClientDealsTab({ clientId }: { clientId: string }) {
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
  if (deals.length === 0) return <EmptyState icon={TrendingUp} title="Nessuna opportunità" description="Le opportunità di vendita per questo cliente appariranno qui." action={<Button size="sm" onClick={() => window.location.href = '/crm/deals'}><Plus className="h-4 w-4 mr-1" />Nuova Opportunità</Button>} />

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

/* ============ CLIENT DOCUMENTS TAB ============ */
function ClientDocumentsTab({ clientId }: { clientId: string }) {
  const CATEGORY_LABELS: Record<string, string> = { contract: 'Contratto', quote: 'Preventivo', invoice: 'Fattura', general: 'Generale' }
  const [docs, setDocs] = useState<Array<{ id: string; name: string; fileUrl: string; fileSize: number | null; mimeType: string | null; category: string; createdAt: string }>>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fetchDocs = useCallback(() => {
    fetch(`/api/clients/${clientId}/documents`)
      .then(r => r.json())
      .then(data => setDocs(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { fetchDocs() }, [fetchDocs])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setUploadError('File troppo grande (max 10MB)'); return }
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch(`/api/clients/${clientId}/documents`, { method: 'POST', body: fd })
      if (res.ok) { fetchDocs() } else { const data = await res.json().catch(() => ({})); setUploadError(data.error || 'Errore upload') }
    } catch { setUploadError('Errore di rete') }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('Eliminare questo documento?')) return
    await fetch(`/api/clients/${clientId}/documents/${docId}`, { method: 'DELETE' })
    fetchDocs()
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted">{docs.length} document{docs.length !== 1 ? 'i' : 'o'}</span>
        <label className={`inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer rounded-lg border border-border/50 px-3 py-1.5 hover:bg-secondary/50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload className="h-4 w-4" />
          {uploading ? 'Caricamento...' : 'Carica File'}
          <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp" />
        </label>
      </div>
      {uploadError && (
        <div className="mb-3 flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{uploadError}
        </div>
      )}
      {docs.length === 0 ? (
        <EmptyState icon={Paperclip} title="Nessun documento" description="Carica contratti, preventivi e documenti relativi al cliente." />
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <Card key={doc.id} className="!p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">{doc.name}</span>
                    <span className="text-xs text-muted">{CATEGORY_LABELS[doc.category] || doc.category} · {formatSize(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString('it-IT')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md hover:bg-secondary/50 text-muted hover:text-foreground transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============ CLIENT TIMELINE TAB ============ */
function ClientTimelineTab({ clientId }: { clientId: string }) {
  const ICON_MAP: Record<string, string> = { interaction: '💬', activity: '📝', task: '✅', deal: '💰', document: '📎' }
  const [items, setItems] = useState<Array<{ id: string; type: string; title: string; description?: string; date: string; metadata?: Record<string, unknown>; user?: { firstName: string; lastName: string } }>>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const fetchTimeline = useCallback((p: number) => {
    setLoading(p === 1)
    fetch(`/api/clients/${clientId}/activity?page=${p}&limit=30`)
      .then(r => r.json())
      .then(data => {
        const newItems = data.items || []
        if (p === 1) setItems(newItems); else setItems(prev => [...prev, ...newItems])
        setHasMore(newItems.length === 30)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => { fetchTimeline(1) }, [fetchTimeline])

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
  if (items.length === 0) return <EmptyState icon={Clock} title="Nessuna attività registrata" description="La cronologia completa delle attività apparirà qui." />

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border/30" />
      <div className="space-y-4">
        {items.map(item => (
          <div key={`${item.type}-${item.id}`} className="flex gap-3 pl-2">
            <div className="relative z-10 flex-shrink-0 w-5 h-5 rounded-full bg-card border border-border/50 flex items-center justify-center text-xs">
              {ICON_MAP[item.type] || '•'}
            </div>
            <div className="flex-1 min-w-0 -mt-0.5">
              <p className="text-sm font-medium">{item.title}</p>
              {item.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{item.description}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted">{new Date(item.date).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                {item.user && <span className="text-xs text-muted">· {item.user.firstName} {item.user.lastName}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => { const next = page + 1; setPage(next); fetchTimeline(next) }}
          className="mt-4 w-full text-center text-sm text-primary hover:text-primary/80 font-medium py-2"
        >
          Carica altri...
        </button>
      )}
    </div>
  )
}
