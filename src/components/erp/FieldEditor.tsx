'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { FieldTypeSelector } from './FieldTypeSelector'
import { CrmMappingEditor } from './CrmMappingEditor'
import { ConditionBuilder } from './ConditionBuilder'
import { ChevronDown, ChevronUp, Trash2, Plus, GripVertical } from 'lucide-react'
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

interface AvailableField {
  id: string
  name: string
  label: string
}

interface FieldEditorProps {
  field: WizardFieldData
  index: number
  onSave: (field: WizardFieldData) => void
  onDelete: () => void
  availableFields: AvailableField[]
}

const NEEDS_OPTIONS = ['SELECT', 'MULTISELECT', 'RADIO']

function slugifyName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function FieldEditor({ field, index, onSave, onDelete, availableFields }: FieldEditorProps) {
  const [expanded, setExpanded] = useState(!field.id)
  const [data, setData] = useState<WizardFieldData>(field)
  const [dirty, setDirty] = useState(false)

  const update = (partial: Partial<WizardFieldData>) => {
    setData((prev) => ({ ...prev, ...partial }))
    setDirty(true)
  }

  const handleLabelChange = (label: string) => {
    const autoName = !field.id || data.name === slugifyName(field.label)
    update({
      label,
      ...(autoName && { name: slugifyName(label) }),
    })
  }

  const handleSave = () => {
    onSave(data)
    setDirty(false)
  }

  const addOption = () => {
    const options = [...(data.options || [])]
    options.push({ label: '', value: '' })
    update({ options })
  }

  const updateOption = (idx: number, partial: Partial<FieldOption>) => {
    const options = [...(data.options || [])]
    options[idx] = { ...options[idx], ...partial }
    // Auto-fill value from label
    if (partial.label && !options[idx].value) {
      options[idx].value = slugifyName(partial.label)
    }
    update({ options })
  }

  const removeOption = (idx: number) => {
    const options = [...(data.options || [])]
    options.splice(idx, 1)
    update({ options })
  }

  return (
    <div className={cn('border border-border/40 rounded-lg', expanded && 'bg-secondary/10')}>
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-secondary/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="h-4 w-4 text-muted flex-shrink-0" />
        <span className="text-xs text-muted font-mono">{index + 1}</span>
        <span className="font-medium text-sm truncate flex-1">{data.label || 'Nuovo campo'}</span>
        <span className="text-xs text-muted">{data.type}</span>
        {data.isRequired && <span className="text-xs text-destructive">*</span>}
        {dirty && <span className="h-2 w-2 rounded-full bg-warning flex-shrink-0" />}
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-4 border-t border-border/30">
          <div className="pt-3">
            <label className="text-xs font-medium text-muted mb-1 block">Tipo campo</label>
            <FieldTypeSelector value={data.type} onChange={(type) => update({ type })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Etichetta *</label>
              <Input
                value={data.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="es. Ragione Sociale"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Nome campo</label>
              <Input
                value={data.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="es. ragione_sociale"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Placeholder</label>
              <Input
                value={data.placeholder || ''}
                onChange={(e) => update({ placeholder: e.target.value })}
                placeholder="Testo segnaposto..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Valore predefinito</label>
              <Input
                value={data.defaultValue || ''}
                onChange={(e) => update({ defaultValue: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted mb-1 block">Testo di aiuto</label>
            <Input
              value={data.helpText || ''}
              onChange={(e) => update({ helpText: e.target.value })}
              placeholder="Breve descrizione per guidare l'utente..."
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={data.isRequired}
                onChange={(e) => update({ isRequired: e.target.checked })}
                className="rounded border-border"
              />
              Campo obbligatorio
            </label>
          </div>

          {NEEDS_OPTIONS.includes(data.type) && (
            <div>
              <label className="text-xs font-medium text-muted mb-2 block">Opzioni</label>
              <div className="space-y-2">
                {(data.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(i, { label: e.target.value })}
                      placeholder="Etichetta"
                      className="flex-1"
                    />
                    <Input
                      value={opt.value}
                      onChange={(e) => updateOption(i, { value: e.target.value })}
                      placeholder="Valore"
                      className="flex-1 font-mono text-xs"
                    />
                    <Button variant="ghost" size="icon" type="button" onClick={() => removeOption(i)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" type="button" onClick={addOption}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Aggiungi opzione
                </Button>
              </div>
            </div>
          )}

          {['NUMBER', 'SCALE'].includes(data.type) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">Valore minimo</label>
                <Input
                  type="number"
                  value={data.validation?.min ?? ''}
                  onChange={(e) => update({ validation: { ...data.validation, min: e.target.value ? Number(e.target.value) : undefined } })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">Valore massimo</label>
                <Input
                  type="number"
                  value={data.validation?.max ?? ''}
                  onChange={(e) => update({ validation: { ...data.validation, max: e.target.value ? Number(e.target.value) : undefined } })}
                />
              </div>
            </div>
          )}

          {['TEXT', 'TEXTAREA'].includes(data.type) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">Lunghezza minima</label>
                <Input
                  type="number"
                  value={data.validation?.minLength ?? ''}
                  onChange={(e) => update({ validation: { ...data.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">Lunghezza massima</label>
                <Input
                  type="number"
                  value={data.validation?.maxLength ?? ''}
                  onChange={(e) => update({ validation: { ...data.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })}
                />
              </div>
            </div>
          )}

          <CrmMappingEditor
            value={data.crmMapping}
            onChange={(crmMapping) => update({ crmMapping })}
          />

          <div>
            <label className="text-xs font-medium text-muted mb-2 block">Condizione di visibilita</label>
            <ConditionBuilder
              condition={data.condition}
              onChange={(condition) => update({ condition })}
              availableFields={availableFields}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <Button variant="destructive" size="sm" type="button" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Elimina campo
            </Button>
            <Button size="sm" type="button" onClick={handleSave} disabled={!dirty || !data.label || !data.name}>
              Salva campo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
