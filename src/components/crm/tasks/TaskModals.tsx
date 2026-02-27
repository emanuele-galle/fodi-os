'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import {
  TASK_TYPE_OPTIONS, TASK_STATUS_OPTIONS, PRIORITY_OPTIONS,
  type Client, type StaffUser, type NewTaskForm, type EditTaskForm,
} from './types'

interface TaskCreateModalProps {
  open: boolean
  onClose: () => void
  form: NewTaskForm
  onFormChange: (form: NewTaskForm) => void
  clients: Client[]
  staffUsers: StaffUser[]
  onSubmit: () => void
  submitting: boolean
  formError: string | null
}

export function TaskCreateModal({
  open, onClose, form, onFormChange, clients, staffUsers, onSubmit, submitting, formError,
}: TaskCreateModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Nuova Attività CRM" size="lg">
      <div className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {formError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Titolo *" value={form.title} onChange={(e) => onFormChange({ ...form, title: e.target.value })} placeholder="Descrizione breve attività" />
          </div>
          <Select
            label="Cliente *"
            options={[
              { value: '', label: 'Seleziona cliente' },
              ...clients.map(c => ({ value: c.id, label: c.companyName }))
            ]}
            value={form.clientId}
            onChange={(e) => onFormChange({ ...form, clientId: e.target.value })}
          />
          <Select
            label="Assegnato a"
            options={[
              { value: '', label: 'Non assegnato' },
              ...staffUsers.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
            ]}
            value={form.assigneeId}
            onChange={(e) => onFormChange({ ...form, assigneeId: e.target.value })}
          />
          <Select
            label="Tipo Attività"
            options={TASK_TYPE_OPTIONS.filter(o => o.value !== '')}
            value={form.taskType}
            onChange={(e) => onFormChange({ ...form, taskType: e.target.value })}
          />
          <Select
            label="Priorità"
            options={PRIORITY_OPTIONS.filter(o => o.value !== '')}
            value={form.priority}
            onChange={(e) => onFormChange({ ...form, priority: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Input
              label="Scadenza"
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => onFormChange({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Descrizione</label>
          <textarea
            value={form.description}
            onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            placeholder="Dettagli attività..."
            rows={3}
            className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={onSubmit} disabled={submitting || !form.title || !form.clientId}>
            {submitting ? 'Salvataggio...' : 'Crea Attività'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

interface TaskEditModalProps {
  open: boolean
  onClose: () => void
  form: EditTaskForm
  onFormChange: (form: EditTaskForm) => void
  clients: Client[]
  staffUsers: StaffUser[]
  onSubmit: () => void
  submitting: boolean
  formError: string | null
}

export function TaskEditModal({
  open, onClose, form, onFormChange, clients, staffUsers, onSubmit, submitting, formError,
}: TaskEditModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Modifica Attività" size="lg">
      <div className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {formError}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Titolo" value={form.title} onChange={(e) => onFormChange({ ...form, title: e.target.value })} />
          </div>
          <Select
            label="Cliente"
            options={[
              { value: '', label: 'Nessun cliente' },
              ...clients.map(c => ({ value: c.id, label: c.companyName }))
            ]}
            value={form.clientId}
            onChange={(e) => onFormChange({ ...form, clientId: e.target.value })}
          />
          <Select
            label="Assegnato a"
            options={[
              { value: '', label: 'Non assegnato' },
              ...staffUsers.map(u => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
            ]}
            value={form.assigneeId}
            onChange={(e) => onFormChange({ ...form, assigneeId: e.target.value })}
          />
          <Select
            label="Tipo Attività"
            options={TASK_TYPE_OPTIONS}
            value={form.taskType}
            onChange={(e) => onFormChange({ ...form, taskType: e.target.value })}
          />
          <Select
            label="Priorità"
            options={PRIORITY_OPTIONS.filter(o => o.value !== '')}
            value={form.priority}
            onChange={(e) => onFormChange({ ...form, priority: e.target.value })}
          />
          <Select
            label="Stato"
            options={TASK_STATUS_OPTIONS.filter(o => o.value !== '')}
            value={form.status}
            onChange={(e) => onFormChange({ ...form, status: e.target.value })}
          />
          <div>
            <Input
              label="Scadenza"
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => onFormChange({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Descrizione</label>
          <textarea
            value={form.description}
            onChange={(e) => onFormChange({ ...form, description: e.target.value })}
            rows={3}
            className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Salvataggio...' : 'Salva'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

interface TaskDeleteModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  submitting: boolean
  formError: string | null
}

export function TaskDeleteModal({ open, onClose, onConfirm, submitting, formError }: TaskDeleteModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Elimina Attività" size="sm">
      <div className="space-y-4">
        {formError && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {formError}
          </div>
        )}
        <p className="text-sm text-muted">Sei sicuro di voler eliminare questa attività? L&apos;azione non è reversibile.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
