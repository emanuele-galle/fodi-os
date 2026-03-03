'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
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

  const update = useCallback((partial: Partial<WizardFieldData>) => {
    setData((prev) => ({ ...prev, ...partial }))
    setDirty(true)
  }, [])

  const handleLabelChange = useCallback((label: string) => {
    setData((prev) => {
      const autoName = !field.id || prev.name === slugifyName(field.label)
      return { ...prev, label, ...(autoName && { name: slugifyName(label) }) }
    })
    setDirty(true)
  }, [field.id, field.label])

  // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- depends on component state
  const handleSave = () => {
    onSave(data)
    setDirty(false)
  }

  // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- depends on component state
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

  const handleToggle = useCallback(() => setExpanded((v) => !v), [])
  const handleLabelInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => handleLabelChange(e.target.value), [handleLabelChange])
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => update({ name: e.target.value }), [update])
  const handlePlaceholderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => update({ placeholder: e.target.value }), [update])
  const handleDefaultValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => update({ defaultValue: e.target.value }), [update])
  const handleHelpTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => update({ helpText: e.target.value }), [update])
  const handleRequiredChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => update({ isRequired: e.target.checked }), [update])
  const handleTypeChange = useCallback((type: string) => update({ type }), [update])
  const handleCrmMappingChange = useCallback((crmMapping: string | null) => update({ crmMapping }), [update])
  const handleConditionChange = useCallback((condition: { fieldId: string; operator: string; value: string } | null) => update({ condition }), [update])

  return (
    <div className={cn('border border-border/40 rounded-lg', expanded && 'bg-secondary/10')}>
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-secondary/20 transition-colors"
        onClick={handleToggle}
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
            <FieldTypeSelector value={data.type} onChange={handleTypeChange} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Etichetta *</label>
              <Input
                value={data.label}
                onChange={handleLabelInput}
                placeholder="es. Ragione Sociale"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Nome campo</label>
              <Input
                value={data.name}
                onChange={handleNameChange}
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
                onChange={handlePlaceholderChange}
                placeholder="Testo segnaposto..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted mb-1 block">Valore predefinito</label>
              <Input
                value={data.defaultValue || ''}
                onChange={handleDefaultValueChange}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted mb-1 block">Testo di aiuto</label>
            <Input
              value={data.helpText || ''}
              onChange={handleHelpTextChange}
              placeholder="Breve descrizione per guidare l'utente..."
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={data.isRequired}
                onChange={handleRequiredChange}
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
                      // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- loop captures index
                      onChange={(e) => updateOption(i, { label: e.target.value })}
                      placeholder="Etichetta"
                      className="flex-1"
                    />
                    <Input
                      value={opt.value}
                      // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- loop captures index
                      onChange={(e) => updateOption(i, { value: e.target.value })}
                      placeholder="Valore"
                      className="flex-1 font-mono text-xs"
                    />
                    {/* eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- loop captures index */}
                    <Button variant="ghost" size="icon" type="button" onClick={() => removeOption(i)} aria-label="Rimuovi opzione">
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
                  // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- dynamic validation merge
                  onChange={(e) => update({ validation: { ...data.validation, min: e.target.value ? Number(e.target.value) : undefined } })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">Valore massimo</label>
                <Input
                  type="number"
                  value={data.validation?.max ?? ''}
                  // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- dynamic validation merge
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
                  // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- dynamic validation merge
                  onChange={(e) => update({ validation: { ...data.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">Lunghezza massima</label>
                <Input
                  type="number"
                  value={data.validation?.maxLength ?? ''}
                  // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- dynamic validation merge
                  onChange={(e) => update({ validation: { ...data.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })}
                />
              </div>
            </div>
          )}

          <CrmMappingEditor
            value={data.crmMapping}
            onChange={handleCrmMappingChange}
          />

          <div>
            <label className="text-xs font-medium text-muted mb-2 block">Condizione di visibilita</label>
            <ConditionBuilder
              condition={data.condition}
              onChange={handleConditionChange}
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
