'use client'

import { useCallback, useMemo } from 'react'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Trash2 } from 'lucide-react'

interface WizardFieldRef {
  id: string
  name: string
  label: string
}

interface Condition {
  fieldId: string
  operator: string
  value: string
}

interface ConditionBuilderProps {
  condition: Condition | null
  onChange: (condition: Condition | null) => void
  availableFields: WizardFieldRef[]
}

const OPERATORS = [
  { value: 'eq', label: 'Uguale a' },
  { value: 'neq', label: 'Diverso da' },
  { value: 'gt', label: 'Maggiore di' },
  { value: 'lt', label: 'Minore di' },
  { value: 'gte', label: 'Maggiore o uguale' },
  { value: 'lte', label: 'Minore o uguale' },
  { value: 'contains', label: 'Contiene' },
  { value: 'notContains', label: 'Non contiene' },
  { value: 'empty', label: 'Vuoto' },
  { value: 'notEmpty', label: 'Non vuoto' },
]

export function ConditionBuilder({ condition, onChange, availableFields }: ConditionBuilderProps) {
  const handleAdd = useCallback(() => onChange({ fieldId: '', operator: 'eq', value: '' }), [onChange])
  const handleRemove = useCallback(() => onChange(null), [onChange])
  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...condition!, fieldId: e.target.value })
  }, [condition, onChange])
  const handleOperatorChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...condition!, operator: e.target.value })
  }, [condition, onChange])
  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...condition!, value: e.target.value })
  }, [condition, onChange])

  const fieldOptions = useMemo(() => [
    { value: '', label: 'Seleziona campo...' },
    ...availableFields.map((f) => ({ value: f.name, label: f.label })),
  ], [availableFields])

  if (!condition) {
    return (
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={handleAdd}
        disabled={availableFields.length === 0}
      >
        + Aggiungi condizione
      </Button>
    )
  }

  const needsValue = !['empty', 'notEmpty'].includes(condition.operator)

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end">
      <div className="flex-1 min-w-0">
        <label className="text-xs text-muted mb-1 block">Campo</label>
        <Select
          options={fieldOptions}
          value={condition.fieldId}
          onChange={handleFieldChange}
        />
      </div>
      <div className="w-full sm:w-44">
        <label className="text-xs text-muted mb-1 block">Operatore</label>
        <Select
          options={OPERATORS}
          value={condition.operator}
          onChange={handleOperatorChange}
        />
      </div>
      {needsValue && (
        <div className="flex-1 min-w-0">
          <label className="text-xs text-muted mb-1 block">Valore</label>
          <Input
            value={condition.value}
            onChange={handleValueChange}
            placeholder="Valore..."
          />
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={handleRemove}
        className="flex-shrink-0 text-destructive"
        aria-label="Rimuovi condizione"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
