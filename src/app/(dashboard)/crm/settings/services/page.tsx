'use client'

import { useState, useCallback } from 'react'
import { useFetch } from '@/hooks/useFetch'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Pencil, Package, Power, PowerOff, Loader2 } from 'lucide-react'

interface Service {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  priceType: string
  priceMin: string | null
  priceMax: string | null
  tags: string[]
  isActive: boolean
  sortOrder: number
  _count: { clientServices: number }
}

const PRICE_TYPE_OPTIONS = [
  { value: 'FIXED', label: 'Fisso' },
  { value: 'RANGE', label: 'Range' },
  { value: 'HOURLY', label: 'Orario' },
  { value: 'CUSTOM', label: 'Su preventivo' },
]

const CATEGORY_OPTIONS = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'branding', label: 'Branding' },
  { value: 'digital', label: 'Digital' },
  { value: 'events', label: 'Eventi' },
  { value: 'media', label: 'Media' },
  { value: 'storytelling', label: 'Storytelling' },
  { value: 'consulting', label: 'Consulenza' },
  { value: 'other', label: 'Altro' },
]

export default function ServicesSettingsPage() {
  const { data: raw, loading, refetch } = useFetch<{ success: boolean; data: Service[] }>('/api/crm/services')
  const services = raw?.success ? raw.data : []

  const [createOpen, setCreateOpen] = useState(false)
  const [editService, setEditService] = useState<Service | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '', slug: '', description: '', category: 'marketing',
    priceType: 'FIXED', priceMin: '', priceMax: '', tags: '', sortOrder: '0',
  })

  const resetForm = useCallback(() => {
    setForm({ name: '', slug: '', description: '', category: 'marketing', priceType: 'FIXED', priceMin: '', priceMax: '', tags: '', sortOrder: '0' })
  }, [])

  const openCreate = useCallback(() => { resetForm(); setCreateOpen(true) }, [resetForm])

  const openEdit = useCallback((s: Service) => {
    setForm({
      name: s.name, slug: s.slug, description: s.description || '',
      category: s.category, priceType: s.priceType,
      priceMin: s.priceMin || '', priceMax: s.priceMax || '',
      tags: s.tags.join(', '), sortOrder: String(s.sortOrder),
    })
    setEditService(s)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.slug.trim()) return
    setSubmitting(true)

    const body = {
      name: form.name, slug: form.slug, description: form.description || null,
      category: form.category, priceType: form.priceType,
      priceMin: form.priceMin ? parseFloat(form.priceMin) : null,
      priceMax: form.priceMax ? parseFloat(form.priceMax) : null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      sortOrder: parseInt(form.sortOrder) || 0,
    }

    try {
      const url = editService ? `/api/crm/services/${editService.id}` : '/api/crm/services'
      const res = await fetch(url, {
        method: editService ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) { setCreateOpen(false); setEditService(null); refetch() }
    } finally { setSubmitting(false) }
  }, [form, editService, refetch])

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/crm/services/${deleteId}`, { method: 'DELETE' })
      if (res.ok) { setDeleteId(null); refetch() }
    } finally { setSubmitting(false) }
  }, [deleteId, refetch])

  const handleToggle = useCallback(async (s: Service) => {
    await fetch(`/api/crm/services/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !s.isActive }),
    })
    refetch()
  }, [refetch])

  const handleFormChange = useCallback((field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }, [])

  const closeModal = useCallback(() => { setCreateOpen(false); setEditService(null) }, [])
  const closeDelete = useCallback(() => setDeleteId(null), [])

  const activeCount = services.filter(s => s.isActive).length
  const totalClients = services.reduce((sum, s) => sum + s._count.clientServices, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalogo Servizi</h1>
          <p className="text-muted mt-1">Gestisci i servizi offerti per il cross-sell AI</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nuovo Servizio
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border/40 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Servizi Totali</p>
          <p className="text-lg font-bold">{services.length}</p>
        </div>
        <div className="bg-card border border-border/40 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Attivi</p>
          <p className="text-lg font-bold text-emerald-500">{activeCount}</p>
        </div>
        <div className="bg-card border border-border/40 rounded-lg p-3">
          <p className="text-xs text-muted mb-1">Assegnamenti</p>
          <p className="text-lg font-bold text-blue-500">{totalClients}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted">Caricamento...</div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-8 w-8 text-muted mx-auto mb-3" />
            <p className="text-muted">Nessun servizio nel catalogo. Aggiungi il primo per abilitare il cross-sell AI.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggle(s)}
                    className={`flex-shrink-0 ${s.isActive ? 'text-emerald-500' : 'text-muted'}`}
                  >
                    {s.isActive ? <Power className="h-5 w-5" /> : <PowerOff className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${!s.isActive ? 'text-muted' : ''}`}>{s.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{s.category}</Badge>
                      <span className="text-xs text-muted">{s.priceType === 'CUSTOM' ? 'Su preventivo' : s.priceMin ? formatCurrency(s.priceMin) + (s.priceMax ? ` - ${formatCurrency(s.priceMax)}` : '') : '-'}</span>
                      <span className="text-xs text-blue-500">{s._count.clientServices} clienti</span>
                    </div>
                    {s.description && <p className="text-xs text-muted mt-1 truncate">{s.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={createOpen || !!editService} onClose={closeModal} title={editService ? 'Modifica Servizio' : 'Nuovo Servizio'} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome" value={form.name} onChange={handleFormChange('name')} placeholder="es. Social Media Management" />
            <Input label="Slug" value={form.slug} onChange={handleFormChange('slug')} placeholder="es. social-media" disabled={!!editService} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Descrizione</label>
            <textarea
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[80px]"
              value={form.description}
              onChange={handleFormChange('description')}
              placeholder="Descrizione del servizio..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Categoria" options={CATEGORY_OPTIONS} value={form.category} onChange={handleFormChange('category')} />
            <Select label="Tipo Prezzo" options={PRICE_TYPE_OPTIONS} value={form.priceType} onChange={handleFormChange('priceType')} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Prezzo Min" type="number" value={form.priceMin} onChange={handleFormChange('priceMin')} placeholder="0" />
            <Input label="Prezzo Max" type="number" value={form.priceMax} onChange={handleFormChange('priceMax')} placeholder="0" />
            <Input label="Ordine" type="number" value={form.sortOrder} onChange={handleFormChange('sortOrder')} />
          </div>
          <Input label="Tag (comma-sep)" value={form.tags} onChange={handleFormChange('tags')} placeholder="digital, social, brand" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}>Annulla</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.slug.trim() || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editService ? 'Salva' : 'Crea'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteId} onClose={closeDelete} title="Elimina Servizio" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">Sei sicuro di voler eliminare questo servizio dal catalogo?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDelete}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} loading={submitting}>Elimina</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
