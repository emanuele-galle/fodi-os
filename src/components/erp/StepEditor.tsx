'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FieldEditor } from './FieldEditor'
import { ConditionBuilder } from './ConditionBuilder'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'
import { ChevronDown, ChevronUp, Trash2, Plus, GripVertical, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FieldOption {
  label: string
  value: string
}

interface WizardFieldData {
  id?: string
  label: string
  name: string
  type: string
  placeholder: string
  helpText: string
  isRequired: boolean
  sortOrder: number
  options: FieldOption[] | null
  validation: { min?: number; max?: number; minLength?: number; maxLength?: number; pattern?: string } | null
  defaultValue: string
  condition: { fieldId: string; operator: string; value: string } | null
  crmMapping: string | null
}

interface WizardStepData {
  id?: string
  title: string
  description: string
  sortOrder: number
  condition: { fieldId: string; operator: string; value: string } | null
  fields: WizardFieldData[]
}

interface AvailableField {
  id: string
  name: string
  label: string
}

interface StepEditorProps {
  step: WizardStepData
  index: number
  wizardId: string
  onUpdate: () => void
  onDelete: () => void
  allFieldsFromPreviousSteps: AvailableField[]
}

export function StepEditor({ step, index, wizardId, onUpdate, onDelete, allFieldsFromPreviousSteps }: StepEditorProps) {
  const [expanded, setExpanded] = useState(!step.id)
  const [title, setTitle] = useState(step.title)
  const [description, setDescription] = useState(step.description || '')
  const [condition, setCondition] = useState(step.condition)
  const [saving, setSaving] = useState(false)
  const [saveFirstMsg, setSaveFirstMsg] = useState(false)
  const { confirm, confirmProps } = useConfirm()

  const saveStep = useCallback(async () => {
    setSaving(true)
    try {
      if (step.id) {
        await fetch(`/api/wizards/${wizardId}/steps/${step.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description: description || null, condition }),
        })
      } else {
        await fetch(`/api/wizards/${wizardId}/steps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description: description || null, sortOrder: step.sortOrder, condition }),
        })
      }
      onUpdate()
    } finally {
      setSaving(false)
    }
  }, [step.id, wizardId, title, description, condition, step.sortOrder, onUpdate])

  const saveField = useCallback(async (field: WizardFieldData, stepId: string) => {
    if (field.id) {
      await fetch(`/api/wizards/${wizardId}/steps/${stepId}/fields/${field.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field),
      })
    } else {
      await fetch(`/api/wizards/${wizardId}/steps/${stepId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field),
      })
    }
    onUpdate()
  }, [wizardId, onUpdate])

  const deleteField = useCallback(async (fieldId: string, stepId: string) => {
    const ok = await confirm({ message: 'Eliminare questo campo?', variant: 'danger' })
    if (!ok) return
    await fetch(`/api/wizards/${wizardId}/steps/${stepId}/fields/${fieldId}`, {
      method: 'DELETE',
    })
    onUpdate()
  }, [wizardId, onUpdate, confirm])

  const addNewField = useCallback(async () => {
    if (!step.id) {
      setSaveFirstMsg(true)
      setTimeout(() => setSaveFirstMsg(false), 3000)
      return
    }
    const newField: WizardFieldData = {
      label: '',
      name: '',
      type: 'TEXT',
      placeholder: '',
      helpText: '',
      isRequired: false,
      sortOrder: step.fields.length,
      options: null,
      validation: null,
      defaultValue: '',
      condition: null,
      crmMapping: null,
    }
    // We add it temporarily for the UI; on save it will be POSTed
    step.fields.push(newField)
    onUpdate()
  }, [step, onUpdate])

  const deleteStep = useCallback(async () => {
    const ok = await confirm({ message: 'Eliminare questo step e tutti i suoi campi?', variant: 'danger' })
    if (!ok) return
    if (step.id) {
      await fetch(`/api/wizards/${wizardId}/steps/${step.id}`, { method: 'DELETE' })
    }
    onDelete()
  }, [step.id, wizardId, onDelete, confirm])

  // All fields from this step for condition builder
  const fieldsForCondition: AvailableField[] = step.fields
    .filter((f) => f.id)
    .map((f) => ({ id: f.id!, name: f.name, label: f.label }))

  const allAvailableFields = [...allFieldsFromPreviousSteps, ...fieldsForCondition]

  return (
    <div className={cn('border border-border/40 rounded-xl', expanded && 'bg-card')}>
      <div
        className="flex items-center gap-2 p-4 cursor-pointer hover:bg-secondary/20 transition-colors rounded-xl"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="h-4 w-4 text-muted flex-shrink-0" />
        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
          {index + 1}
        </span>
        <span className="font-semibold truncate flex-1">{step.title || 'Nuovo step'}</span>
        <span className="text-xs text-muted">{step.fields.length} campi</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/30">
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Titolo step *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="es. Dati Azienda" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Descrizione</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrizione opzionale..." />
            </div>
          </div>

          {allFieldsFromPreviousSteps.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted mb-2 block">Condizione di visibilita</label>
              <ConditionBuilder
                condition={condition}
                onChange={setCondition}
                availableFields={allFieldsFromPreviousSteps}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={saveStep} loading={saving} disabled={!title}>
              <Save className="h-3.5 w-3.5 mr-1" />
              Salva step
            </Button>
          </div>

          {step.id && (
            <>
              <div className="border-t border-border/30 pt-3">
                {saveFirstMsg && (
                  <div className="mb-2 text-sm text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                    Salva prima lo step
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">Campi</h4>
                  <Button variant="outline" size="sm" type="button" onClick={addNewField}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Aggiungi campo
                  </Button>
                </div>
                <div className="space-y-2">
                  {step.fields.map((field, fi) => (
                    <FieldEditor
                      key={field.id || `new-${fi}`}
                      field={field}
                      index={fi}
                      onSave={(updated) => saveField(updated, step.id!)}
                      onDelete={() => field.id ? deleteField(field.id, step.id!) : onUpdate()}
                      availableFields={allAvailableFields}
                    />
                  ))}
                  {step.fields.length === 0 && (
                    <p className="text-sm text-muted text-center py-4">
                      Nessun campo. Aggiungi il primo campo a questo step.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-start pt-2 border-t border-border/30">
                <Button variant="destructive" size="sm" type="button" onClick={deleteStep}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Elimina step
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
