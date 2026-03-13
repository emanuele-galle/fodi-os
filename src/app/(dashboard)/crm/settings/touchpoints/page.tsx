'use client'

import { useState, useCallback } from 'react'
import { useFetch } from '@/hooks/useFetch'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Plus, Trash2, Pencil, Zap, Power, PowerOff, Loader2 } from 'lucide-react'

interface TouchpointRule {
  id: string
  name: string
  triggerType: string
  triggerConfig: Record<string, unknown>
  actionType: string
  actionConfig: Record<string, unknown>
  isActive: boolean
  createdAt: string
}

const TRIGGER_LABELS: Record<string, string> = {
  INACTIVITY: 'Inattivita',
  ANNIVERSARY: 'Anniversario',
  DEAL_WON: 'Deal Vinto',
  CUSTOM: 'Personalizzato',
}

const ACTION_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  NOTIFICATION: 'Notifica',
  TASK: 'Task',
}

const TRIGGER_OPTIONS = Object.entries(TRIGGER_LABELS).map(([value, label]) => ({ value, label }))
const ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))

export default function TouchpointsSettingsPage() {
  const { data: rulesRaw, loading, refetch } = useFetch<{ success: boolean; data: TouchpointRule[] }>('/api/crm/touchpoints')
  const rules = rulesRaw?.success ? rulesRaw.data : []

  const [createOpen, setCreateOpen] = useState(false)
  const [editRule, setEditRule] = useState<TouchpointRule | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [seeding, setSeeding] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '', triggerType: 'INACTIVITY', actionType: 'NOTIFICATION',
    daysInactive: '30', subject: '', message: '', taskTitle: '', taskPriority: 'MEDIUM', templateSlug: '',
  })

  const resetForm = useCallback(() => {
    setForm({
      name: '', triggerType: 'INACTIVITY', actionType: 'NOTIFICATION',
      daysInactive: '30', subject: '', message: '', taskTitle: '', taskPriority: 'MEDIUM', templateSlug: '',
    })
  }, [])

  const openCreate = useCallback(() => { resetForm(); setCreateOpen(true) }, [resetForm])

  const openEdit = useCallback((rule: TouchpointRule) => {
    const tc = rule.triggerConfig
    const ac = rule.actionConfig
    setForm({
      name: rule.name,
      triggerType: rule.triggerType,
      actionType: rule.actionType,
      daysInactive: String(tc.daysInactive || 30),
      subject: String(ac.subject || ''),
      message: String(ac.message || ''),
      taskTitle: String(ac.taskTitle || ''),
      taskPriority: String(ac.taskPriority || 'MEDIUM'),
      templateSlug: String(ac.templateSlug || ''),
    })
    setEditRule(rule)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return
    setSubmitting(true)

    const triggerConfig: Record<string, unknown> = {}
    if (form.triggerType === 'INACTIVITY') triggerConfig.daysInactive = parseInt(form.daysInactive) || 30

    const actionConfig: Record<string, unknown> = {}
    if (form.subject) actionConfig.subject = form.subject
    if (form.message) actionConfig.message = form.message
    if (form.actionType === 'TASK') {
      if (form.taskTitle) actionConfig.taskTitle = form.taskTitle
      actionConfig.taskPriority = form.taskPriority
    }
    if (form.actionType === 'EMAIL' && form.templateSlug) actionConfig.templateSlug = form.templateSlug

    const body = {
      name: form.name, triggerType: form.triggerType, actionType: form.actionType,
      triggerConfig, actionConfig,
    }

    try {
      const url = editRule ? `/api/crm/touchpoints/${editRule.id}` : '/api/crm/touchpoints'
      const res = await fetch(url, {
        method: editRule ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setCreateOpen(false)
        setEditRule(null)
        refetch()
      }
    } finally {
      setSubmitting(false)
    }
  }, [form, editRule, refetch])

  const handleDelete = useCallback(async () => {
    if (!deleteId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/crm/touchpoints/${deleteId}`, { method: 'DELETE' })
      if (res.ok) { setDeleteId(null); refetch() }
    } finally { setSubmitting(false) }
  }, [deleteId, refetch])

  const handleToggle = useCallback(async (rule: TouchpointRule) => {
    await fetch(`/api/crm/touchpoints/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rule.isActive }),
    })
    refetch()
  }, [refetch])

  const handleSeed = useCallback(async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/crm/touchpoints/seed', {
        method: 'POST',
        headers: { 'x-user-role': 'ADMIN' },
      })
      if (res.ok) refetch()
    } finally { setSeeding(false) }
  }, [refetch])

  const handleFormChange = useCallback((field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }, [])

  const closeModal = useCallback(() => { setCreateOpen(false); setEditRule(null) }, [])
  const closeDelete = useCallback(() => setDeleteId(null), [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Regole Touchpoint</h1>
          <p className="text-muted mt-1">Automazioni per mantenere il contatto con i clienti</p>
        </div>
        <div className="flex gap-2">
          {rules.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeed} loading={seeding}>
              <Zap className="h-4 w-4 mr-1.5" />
              Regole Default
            </Button>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nuova Regola
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted">Caricamento...</div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Zap className="h-8 w-8 text-muted mx-auto mb-3" />
            <p className="text-muted">Nessuna regola touchpoint. Crea la prima o carica le regole default.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`flex-shrink-0 ${rule.isActive ? 'text-emerald-500' : 'text-muted'}`}
                    title={rule.isActive ? 'Disattiva' : 'Attiva'}
                  >
                    {rule.isActive ? <Power className="h-5 w-5" /> : <PowerOff className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${!rule.isActive ? 'text-muted' : ''}`}>{rule.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{TRIGGER_LABELS[rule.triggerType] || rule.triggerType}</Badge>
                      <span className="text-xs text-muted">→</span>
                      <Badge variant="info">{ACTION_LABELS[rule.actionType] || rule.actionType}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(rule.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={createOpen || !!editRule} onClose={closeModal} title={editRule ? 'Modifica Regola' : 'Nuova Regola'} size="md">
        <div className="space-y-4">
          <Input label="Nome" value={form.name} onChange={handleFormChange('name')} placeholder="es. Inattivita 30gg" />
          <Select label="Trigger" options={TRIGGER_OPTIONS} value={form.triggerType} onChange={handleFormChange('triggerType')} />

          {form.triggerType === 'INACTIVITY' && (
            <Input label="Giorni Inattivita" type="number" value={form.daysInactive} onChange={handleFormChange('daysInactive')} />
          )}

          <Select label="Azione" options={ACTION_OPTIONS} value={form.actionType} onChange={handleFormChange('actionType')} />

          {form.actionType === 'EMAIL' && (
            <>
              <Input label="Oggetto Email" value={form.subject} onChange={handleFormChange('subject')} placeholder="Usa {companyName} come variabile" />
              <Input label="Template Slug (opzionale)" value={form.templateSlug} onChange={handleFormChange('templateSlug')} />
            </>
          )}
          {form.actionType === 'TASK' && (
            <>
              <Input label="Titolo Task" value={form.taskTitle} onChange={handleFormChange('taskTitle')} placeholder="Usa {companyName} come variabile" />
              <Select label="Priorita" options={[
                { value: 'LOW', label: 'Bassa' }, { value: 'MEDIUM', label: 'Media' },
                { value: 'HIGH', label: 'Alta' }, { value: 'URGENT', label: 'Urgente' },
              ]} value={form.taskPriority} onChange={handleFormChange('taskPriority')} />
            </>
          )}

          <Input label="Messaggio" value={form.message} onChange={handleFormChange('message')} placeholder="Testo della notifica o email" />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}>Annulla</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editRule ? 'Salva' : 'Crea'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteId} onClose={closeDelete} title="Elimina Regola" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">Sei sicuro di voler eliminare questa regola touchpoint?</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeDelete}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} loading={submitting}>Elimina</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
