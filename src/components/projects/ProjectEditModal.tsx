'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ColorSwatches } from '@/components/ui/ColorSwatches'

interface ClientOption { id: string; companyName: string }
interface WorkspaceOption { id: string; name: string }

const STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Pianificazione' },
  { value: 'IN_PROGRESS', label: 'In Corso' },
  { value: 'ON_HOLD', label: 'In Pausa' },
  { value: 'REVIEW', label: 'In Revisione' },
  { value: 'COMPLETED', label: 'Completato' },
  { value: 'CANCELLED', label: 'Cancellato' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Bassa' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

interface ProjectEditModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  initialData: {
    name: string
    description: string | null
    status: string
    priority: string
    clientId?: string | null
    workspaceId: string
    startDate: string | null
    endDate: string | null
    budgetAmount: string | null
    budgetHours: number | null
    color: string
  }
  clients: ClientOption[]
  workspaces: WorkspaceOption[]
  onSaved: () => void
}

export function ProjectEditModal({ open, onClose, projectId, initialData, clients, workspaces, onSaved }: ProjectEditModalProps) {
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: '',
    priority: '',
    clientId: '',
    workspaceId: '',
    startDate: '',
    endDate: '',
    budgetAmount: '',
    budgetHours: '',
    color: '',
  })

  useEffect(() => {
    if (open) {
      setEditForm({
        name: initialData.name || '',
        description: initialData.description || '',
        status: initialData.status || '',
        priority: initialData.priority || '',
        clientId: initialData.clientId || '',
        workspaceId: initialData.workspaceId || '',
        startDate: initialData.startDate ? initialData.startDate.slice(0, 10) : '',
        endDate: initialData.endDate ? initialData.endDate.slice(0, 10) : '',
        budgetAmount: initialData.budgetAmount || '',
        budgetHours: initialData.budgetHours != null ? String(initialData.budgetHours) : '',
        color: initialData.color || '',
      })
      setEditError(null)
    }
  }, [open, initialData])

  async function handleEditProject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEditSubmitting(true)
    const body: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(editForm)) {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    }
    if (body.budgetAmount) body.budgetAmount = parseFloat(body.budgetAmount as string)
    if (body.budgetHours) body.budgetHours = parseInt(body.budgetHours as string, 10)
    if (body.startDate) body.startDate = new Date(body.startDate as string).toISOString()
    if (body.endDate) body.endDate = new Date(body.endDate as string).toISOString()
    if (!editForm.clientId) body.clientId = null
    if (!editForm.startDate) body.startDate = null
    if (!editForm.endDate) body.endDate = null
    if (!editForm.budgetAmount) body.budgetAmount = null
    if (!editForm.budgetHours) body.budgetHours = null
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        onClose()
        setEditError(null)
        onSaved()
      } else {
        const err = await res.json().catch(() => null)
        setEditError(err?.error || 'Errore durante il salvataggio')
      }
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setEditForm((f) => ({ ...f, [field]: e.target.value }))

  const handleName = handleField('name')
  const handleWorkspace = handleField('workspaceId')
  const handleClient = handleField('clientId')
  const handleDesc = handleField('description')
  const handleStatus = handleField('status')
  const handlePriority = handleField('priority')
  const handleStartDate = handleField('startDate')
  const handleEndDate = handleField('endDate')
  const handleBudget = handleField('budgetAmount')
  const handleHours = handleField('budgetHours')
  const handleColor = (color: string) => setEditForm((f) => ({ ...f, color })) // eslint-disable-line react-perf/jsx-no-new-function-as-prop -- named handler

  const workspaceOptions = useMemo(() => [{ value: '', label: 'Seleziona workspace' }, ...workspaces.map((w) => ({ value: w.id, label: w.name }))], [workspaces])
  const clientOptions = useMemo(() => [{ value: '', label: 'Nessun cliente' }, ...clients.map((c) => ({ value: c.id, label: c.companyName }))], [clients])

  return (
    <Modal open={open} onClose={onClose} title="Modifica Progetto" size="lg">
      <form onSubmit={handleEditProject} className="space-y-4">
        <Input
          label="Nome Progetto *"
          required
          value={editForm.name}
          onChange={handleName}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Workspace"
            value={editForm.workspaceId}
            onChange={handleWorkspace}
            options={workspaceOptions}
          />
          <Select
            label="Cliente"
            value={editForm.clientId}
            onChange={handleClient}
            options={clientOptions}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Descrizione</label>
          <textarea
            rows={3}
            value={editForm.description}
            onChange={handleDesc}
            className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Stato"
            value={editForm.status}
            onChange={handleStatus}
            options={STATUS_OPTIONS}
          />
          <Select
            label="Priorità"
            value={editForm.priority}
            onChange={handlePriority}
            options={PRIORITY_OPTIONS}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data Inizio"
            type="date"
            value={editForm.startDate}
            onChange={handleStartDate}
          />
          <Input
            label="Data Fine"
            type="date"
            value={editForm.endDate}
            onChange={handleEndDate}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Budget (EUR)"
            type="number"
            step="0.01"
            value={editForm.budgetAmount}
            onChange={handleBudget}
          />
          <Input
            label="Ore Previste"
            type="number"
            value={editForm.budgetHours}
            onChange={handleHours}
          />
        </div>
        <ColorSwatches
          value={editForm.color || '#3B82F6'}
          onChange={handleColor}
        />
        {editError && (
          <p className="text-sm text-destructive">{editError}</p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
          <Button type="submit" disabled={editSubmitting}>{editSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}</Button>
        </div>
      </form>
    </Modal>
  )
}
