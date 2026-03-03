'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { ColorSwatches } from '@/components/ui/ColorSwatches'
import { type ClientOption, PRIORITY_OPTIONS } from './types'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  clients: ClientOption[]
  projectForm: {
    values: {
      name: string
      clientId: string
      description: string
      priority: string
      startDate: string
      endDate: string
      budgetAmount: string
      budgetHours: string
      color: string
    }
    setValue: (key: 'name' | 'clientId' | 'description' | 'priority' | 'startDate' | 'endDate' | 'budgetAmount' | 'budgetHours' | 'color', value: string) => void
    setValues: (values: Record<string, string>) => void
    reset: () => void
    hasPersistedData: boolean
  }
  formError: string
  submitting: boolean
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export function CreateProjectModal({
  open,
  onClose,
  clients,
  projectForm,
  formError,
  submitting,
  onSubmit,
}: CreateProjectModalProps) {
  /* eslint-disable react-perf/jsx-no-new-function-as-prop -- named handlers for form fields */
  const handleName = (e: React.ChangeEvent<HTMLInputElement>) => projectForm.setValue('name', e.target.value)
  const handleClient = (e: React.ChangeEvent<HTMLSelectElement>) => projectForm.setValue('clientId', e.target.value)
  const handleDesc = (e: React.ChangeEvent<HTMLTextAreaElement>) => projectForm.setValue('description', e.target.value)
  const handlePriority = (e: React.ChangeEvent<HTMLSelectElement>) => projectForm.setValue('priority', e.target.value)
  const handleStartDate = (e: React.ChangeEvent<HTMLInputElement>) => projectForm.setValue('startDate', e.target.value)
  const handleEndDate = (e: React.ChangeEvent<HTMLInputElement>) => projectForm.setValue('endDate', e.target.value)
  const handleBudget = (e: React.ChangeEvent<HTMLInputElement>) => projectForm.setValue('budgetAmount', e.target.value)
  const handleHours = (e: React.ChangeEvent<HTMLInputElement>) => projectForm.setValue('budgetHours', e.target.value)
  const handleColor = (color: string) => projectForm.setValue('color', color)
  /* eslint-enable react-perf/jsx-no-new-function-as-prop */
  const clientOptions = useMemo(() => [{ value: '', label: 'Seleziona cliente' }, ...clients.map((c) => ({ value: c.id, label: c.companyName }))], [clients])

  return (
    <Modal open={open} onClose={onClose} title="Nuovo Progetto" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        {projectForm.hasPersistedData && (
          <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            <span>Bozza recuperata</span>
            <button type="button" onClick={projectForm.reset} className="underline hover:no-underline">Scarta bozza</button>
          </div>
        )}
        <Input label="Nome Progetto *" required value={projectForm.values.name} onChange={handleName} />
        <Select
          label="Cliente"
          value={projectForm.values.clientId}
          onChange={handleClient}
          options={clientOptions}
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Descrizione</label>
          <textarea
            rows={3}
            value={projectForm.values.description}
            onChange={handleDesc}
            className="flex w-full rounded-[10px] border border-border/40 bg-card shadow-[var(--shadow-sm)] px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <Select label="Priorita" options={PRIORITY_OPTIONS} value={projectForm.values.priority} onChange={handlePriority} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Data Inizio" type="date" value={projectForm.values.startDate} onChange={handleStartDate} />
          <Input label="Data Fine" type="date" value={projectForm.values.endDate} onChange={handleEndDate} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Budget (EUR)" type="number" step="0.01" value={projectForm.values.budgetAmount} onChange={handleBudget} />
          <Input label="Ore Previste" type="number" value={projectForm.values.budgetHours} onChange={handleHours} />
        </div>
        <ColorSwatches
          value={projectForm.values.color}
          onChange={handleColor}
        />
        {formError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
          <Button type="submit" loading={submitting}>Crea Progetto</Button>
        </div>
      </form>
    </Modal>
  )
}
