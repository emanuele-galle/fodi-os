'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Search, Plus, Edit, Trash2, ArrowRightLeft, ChevronLeft, ChevronRight, AlertCircle, Mail, Phone, Building2, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Avatar } from '@/components/ui/Avatar'
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_LABELS, SOURCE_OPTIONS, INDUSTRY_OPTIONS } from '@/lib/crm-constants'

interface StaffUser {
  id: string
  firstName: string
  lastName: string
  role: string
}

interface Lead {
  id: string
  name: string
  email: string
  company: string | null
  phone: string | null
  service: string | null
  message: string
  source: string
  status: string
  notes: string | null
  assigneeId: string | null
  assignee: { id: string; firstName: string; lastName: string } | null
  convertedClientId: string | null
  convertedClient: { id: string; companyName: string } | null
  createdAt: string
  updatedAt: string
}

const emptyNewLead = {
  name: '',
  email: '',
  company: '',
  phone: '',
  service: '',
  message: '',
  source: 'website',
}

const emptyEditForm = {
  name: '',
  email: '',
  company: '',
  phone: '',
  service: '',
  message: '',
  source: '',
  status: '',
  notes: '',
  assigneeId: '',
}

const emptyConvertForm = {
  companyName: '',
  industry: '',
  source: '',
  status: 'PROSPECT',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const limit = 20

  // Modal states
  const [modalOpen, setModalOpen] = useState(false)
  const [newLead, setNewLead] = useState(emptyNewLead)
  const [editLeadId, setEditLeadId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [convertLeadId, setConvertLeadId] = useState<string | null>(null)
  const [convertForm, setConvertForm] = useState(emptyConvertForm)
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (assigneeFilter) params.set('assigneeId', assigneeFilter)
      const res = await fetch(`/api/leads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.items || [])
        setTotal(data.total || 0)
        if (data.statusCounts) setStatusCounts(data.statusCounts)
      } else {
        setFetchError('Errore nel caricamento dei lead')
      }
    } catch {
      setFetchError('Errore di rete nel caricamento dei lead')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, assigneeFilter])

  useEffect(() => { fetchLeads() }, [fetchLeads])
  useEffect(() => { setPage(1) }, [search, statusFilter, assigneeFilter])
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(data => {
      const users = (data.items || data.data || []).filter((u: StaffUser & { isActive?: boolean }) =>
        u.isActive !== false && ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM'].includes(u.role)
      )
      setStaffUsers(users)
    }).catch(() => {})
  }, [])

  const totalPages = Math.ceil(total / limit)

  // Create lead
  const handleCreate = async () => {
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead),
      })
      if (res.ok) {
        setModalOpen(false)
        setNewLead(emptyNewLead)
        fetchLeads()
      } else {
        const data = await res.json()
        setFormError(data.error || 'Errore nella creazione')
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  // Edit lead
  const openEdit = (lead: Lead) => {
    setEditLeadId(lead.id)
    setEditForm({
      name: lead.name,
      email: lead.email,
      company: lead.company || '',
      phone: lead.phone || '',
      service: lead.service || '',
      message: lead.message,
      source: lead.source,
      status: lead.status,
      notes: lead.notes || '',
      assigneeId: lead.assigneeId || '',
    })
    setFormError(null)
  }

  const handleEdit = async () => {
    if (!editLeadId) return
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = { ...editForm, assigneeId: editForm.assigneeId || null }
      const res = await fetch(`/api/leads/${editLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setEditLeadId(null)
        fetchLeads()
      } else {
        const data = await res.json()
        setFormError(data.error || 'Errore nel salvataggio')
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  // Convert lead
  const openConvert = (lead: Lead) => {
    setConvertLeadId(lead.id)
    setConvertForm({
      companyName: lead.company || lead.name,
      industry: '',
      source: lead.source,
      status: 'PROSPECT',
    })
    setFormError(null)
  }

  const handleConvert = async () => {
    if (!convertLeadId) return
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/leads/${convertLeadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(convertForm),
      })
      if (res.ok) {
        setConvertLeadId(null)
        fetchLeads()
      } else {
        const data = await res.json()
        setFormError(data.error || 'Errore nella conversione')
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete lead
  const handleDelete = async () => {
    if (!deleteLeadId) return
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch(`/api/leads/${deleteLeadId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteLeadId(null)
        fetchLeads()
      } else {
        const data = await res.json()
        setFormError(data.error || 'Errore nella cancellazione')
      }
    } catch {
      setFormError('Errore di rete')
    } finally {
      setSubmitting(false)
    }
  }

  const convertLead = convertLeadId ? leads.find((l) => l.id === convertLeadId) : null

  const handleQuickStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) fetchLeads()
    } catch { /* ignore */ }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Leads</h1>
            <p className="text-xs md:text-sm text-muted mt-0.5">Gestione contatti in fase di acquisizione</p>
          </div>
        </div>
        <Button onClick={() => { setModalOpen(true); setFormError(null) }} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nuovo Lead
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST'].map(s => {
          const count = statusCounts[s] || 0
          return (
            <div key={s} className="bg-card border border-border/40 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[10px] text-muted">{LEAD_STATUS_LABELS[s]}</p>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca per nome, email, azienda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            options={LEAD_STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-44"
          />
          <Select
            options={[
              { value: '', label: 'Tutti gli assegnati' },
              ...staffUsers.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
            ]}
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="w-44"
          />
          <span className="text-sm text-muted whitespace-nowrap">{total} totali</span>
        </div>
      </div>

      {/* Error */}
      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchLeads()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="Nessun lead trovato"
          description={search || statusFilter ? 'Prova a modificare i filtri di ricerca.' : 'Nessun lead al momento. Crea il primo!'}
        />
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-xl border border-border/40 bg-card p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{lead.name}</p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {lead.email}
                    </p>
                    {lead.company && (
                      <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {lead.company}
                      </p>
                    )}
                  </div>
                  <Badge status={lead.status}>{LEAD_STATUS_LABELS[lead.status] || lead.status}</Badge>
                </div>
                {lead.service && (
                  <p className="text-xs text-muted">Servizio: {lead.service}</p>
                )}
                {lead.assignee && (
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <UserCheck className="h-3 w-3" />
                    {lead.assignee.firstName} {lead.assignee.lastName}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">{new Date(lead.createdAt).toLocaleDateString('it-IT')}</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(lead)} className="h-8 w-8 p-0">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    {lead.status !== 'CONVERTED' && (
                      <Button variant="ghost" size="sm" onClick={() => openConvert(lead)} className="h-8 w-8 p-0 text-emerald-600">
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { setDeleteLeadId(lead.id); setFormError(null) }} className="h-8 w-8 p-0 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/30 overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider hidden lg:table-cell">Azienda</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider hidden xl:table-cell">Servizio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider hidden lg:table-cell">Fonte</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Stato</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider hidden lg:table-cell">Collegato a</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider hidden xl:table-cell">Assegnato a</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted/80 uppercase tracking-wider">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted/80 uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/10 hover:bg-secondary/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        {lead.phone && (
                          <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{lead.email}</td>
                    <td className="px-4 py-3 text-muted hidden lg:table-cell">{lead.company || '—'}</td>
                    <td className="px-4 py-3 text-muted hidden xl:table-cell">{lead.service || '—'}</td>
                    <td className="px-4 py-3 text-muted hidden lg:table-cell">{lead.source}</td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => handleQuickStatusChange(lead.id, e.target.value)}
                        className="text-xs font-medium rounded-md border border-border/40 bg-card/50 px-1.5 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        {LEAD_STATUS_OPTIONS.filter(o => o.value !== '').map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {lead.convertedClient ? (
                        <a href={`/crm/${lead.convertedClient.id}`} className="text-primary hover:underline text-sm">
                          {lead.convertedClient.companyName}
                        </a>
                      ) : lead.status === 'CONVERTED' ? (
                        <span className="text-muted text-sm">&mdash;</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {lead.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={`${lead.assignee.firstName} ${lead.assignee.lastName}`} size="xs" />
                          <span className="text-sm text-muted">{lead.assignee.firstName} {lead.assignee.lastName}</span>
                        </div>
                      ) : (
                        <span className="text-muted text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{new Date(lead.createdAt).toLocaleDateString('it-IT')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(lead)} className="h-8 w-8 p-0" title="Modifica">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {lead.status !== 'CONVERTED' && (
                          <Button variant="ghost" size="sm" onClick={() => openConvert(lead)} className="h-8 w-8 p-0 text-emerald-600" title="Converti in cliente">
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => { setDeleteLeadId(lead.id); setFormError(null) }} className="h-8 w-8 p-0 text-destructive" title="Elimina">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted">{total} lead totali</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* New Lead Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Lead" size="lg">
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nome *" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} placeholder="Nome completo" />
            <Input label="Email *" type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} placeholder="email@esempio.it" />
            <Input label="Azienda" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} placeholder="Nome azienda" />
            <Input label="Telefono" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} placeholder="+39 ..." />
            <Input label="Servizio" value={newLead.service} onChange={(e) => setNewLead({ ...newLead, service: e.target.value })} placeholder="Servizio richiesto" />
            <Select label="Fonte" options={SOURCE_OPTIONS.filter((o) => o.value !== '')} value={newLead.source} onChange={(e) => setNewLead({ ...newLead, source: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Messaggio *</label>
            <textarea
              value={newLead.message}
              onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
              placeholder="Descrivi la richiesta..."
              rows={3}
              className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button onClick={handleCreate} disabled={submitting || !newLead.name || !newLead.email || !newLead.message}>
              {submitting ? 'Salvataggio...' : 'Crea Lead'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal open={!!editLeadId} onClose={() => setEditLeadId(null)} title="Modifica Lead" size="lg">
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nome" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            <Input label="Azienda" value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} />
            <Input label="Telefono" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <Input label="Servizio" value={editForm.service} onChange={(e) => setEditForm({ ...editForm, service: e.target.value })} />
            <Select label="Fonte" options={SOURCE_OPTIONS.filter((o) => o.value !== '')} value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} />
            <Select label="Stato" options={LEAD_STATUS_OPTIONS.filter((o) => o.value !== '')} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} />
            <Select
              label="Assegnato a"
              options={[
                { value: '', label: 'Non assegnato' },
                ...staffUsers.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
              ]}
              value={editForm.assigneeId}
              onChange={(e) => setEditForm({ ...editForm, assigneeId: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Messaggio</label>
            <textarea
              value={editForm.message}
              onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
              rows={3}
              className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Note</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2}
              placeholder="Note interne..."
              className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditLeadId(null)}>Annulla</Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Convert Lead Modal */}
      <Modal open={!!convertLeadId} onClose={() => setConvertLeadId(null)} title="Converti Lead in Cliente" size="md">
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {formError}
            </div>
          )}
          {convertLead && (
            <div className="rounded-lg bg-secondary/30 border border-border/20 p-3 space-y-1">
              <p className="text-sm font-medium">{convertLead.name}</p>
              <p className="text-xs text-muted flex items-center gap-1"><Mail className="h-3 w-3" />{convertLead.email}</p>
              {convertLead.phone && <p className="text-xs text-muted flex items-center gap-1"><Phone className="h-3 w-3" />{convertLead.phone}</p>}
              {convertLead.company && <p className="text-xs text-muted flex items-center gap-1"><Building2 className="h-3 w-3" />{convertLead.company}</p>}
            </div>
          )}
          <div className="space-y-4">
            <Input label="Nome Azienda *" value={convertForm.companyName} onChange={(e) => setConvertForm({ ...convertForm, companyName: e.target.value })} placeholder="Nome azienda cliente" />
            <Select label="Settore" options={INDUSTRY_OPTIONS} value={convertForm.industry} onChange={(e) => setConvertForm({ ...convertForm, industry: e.target.value })} />
            <Select
              label="Stato Cliente"
              options={[
                { value: 'PROSPECT', label: 'Prospect' },
                { value: 'ACTIVE', label: 'Attivo' },
              ]}
              value={convertForm.status}
              onChange={(e) => setConvertForm({ ...convertForm, status: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConvertLeadId(null)}>Annulla</Button>
            <Button onClick={handleConvert} disabled={submitting || !convertForm.companyName}>
              {submitting ? 'Conversione...' : 'Converti in Cliente'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteLeadId} onClose={() => setDeleteLeadId(null)} title="Elimina Lead" size="sm">
        <div className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {formError}
            </div>
          )}
          <p className="text-sm text-muted">Sei sicuro di voler eliminare questo lead? L&apos;azione non e reversibile.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteLeadId(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
