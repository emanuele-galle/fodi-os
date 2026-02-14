'use client'

import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FieldOption {
  label: string
  value: string
}

interface WizardFieldDef {
  id: string
  label: string
  name: string
  type: string
  placeholder?: string | null
  helpText?: string | null
  isRequired: boolean
  options?: FieldOption[] | null
  validation?: { min?: number; max?: number; minLength?: number; maxLength?: number } | null
  defaultValue?: string | null
}

interface WizardFieldProps {
  field: WizardFieldDef
  value: unknown
  onChange: (name: string, value: unknown) => void
  error?: string
}

export function WizardField({ field, value, onChange, error }: WizardFieldProps) {
  const val = value ?? field.defaultValue ?? ''

  const renderField = () => {
    switch (field.type) {
      case 'TEXT':
      case 'EMAIL':
      case 'PHONE':
        return (
          <Input
            type={field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : 'text'}
            value={String(val)}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.isRequired}
            maxLength={field.validation?.maxLength}
          />
        )

      case 'TEXTAREA':
        return (
          <textarea
            value={String(val)}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.isRequired}
            maxLength={field.validation?.maxLength}
            rows={4}
            className="w-full rounded-lg border border-border/60 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
          />
        )

      case 'NUMBER':
        return (
          <Input
            type="number"
            value={String(val)}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || ''}
            required={field.isRequired}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        )

      case 'SELECT':
        return (
          <Select
            options={[
              { value: '', label: field.placeholder || 'Seleziona...' },
              ...(field.options || []),
            ]}
            value={String(val)}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        )

      case 'MULTISELECT': {
        const selected = Array.isArray(val) ? val : []
        return (
          <div className="space-y-1.5">
            {(field.options || []).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, opt.value]
                      : selected.filter((v: string) => v !== opt.value)
                    onChange(field.name, next)
                  }}
                  className="rounded border-border"
                />
                {opt.label}
              </label>
            ))}
          </div>
        )
      }

      case 'RADIO':
        return (
          <div className="space-y-1.5">
            {(field.options || []).map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name={field.name}
                  value={opt.value}
                  checked={String(val) === opt.value}
                  onChange={() => onChange(field.name, opt.value)}
                  className="border-border"
                />
                {opt.label}
              </label>
            ))}
          </div>
        )

      case 'CHECKBOX':
        return (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={val === true || val === 'true'}
              onChange={(e) => onChange(field.name, e.target.checked)}
              className="rounded border-border"
            />
            {field.placeholder || field.label}
          </label>
        )

      case 'DATE':
        return (
          <Input
            type="date"
            value={String(val)}
            onChange={(e) => onChange(field.name, e.target.value)}
            required={field.isRequired}
          />
        )

      case 'FILE':
        return (
          <div className="border-2 border-dashed border-border/60 rounded-lg p-4 text-center text-sm text-muted">
            Upload file (funzionalita in arrivo)
          </div>
        )

      case 'RATING': {
        const rating = Number(val) || 0
        const max = field.validation?.max || 5
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: max }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange(field.name, i + 1)}
                className="p-0.5 transition-colors"
              >
                <Star
                  className={cn(
                    'h-6 w-6',
                    i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-border'
                  )}
                />
              </button>
            ))}
          </div>
        )
      }

      case 'SCALE': {
        const min = field.validation?.min ?? 1
        const max = field.validation?.max ?? 10
        const scaleVal = Number(val) || min
        return (
          <div>
            <input
              type="range"
              min={min}
              max={max}
              value={scaleVal}
              onChange={(e) => onChange(field.name, Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>{min}</span>
              <span className="font-bold text-foreground">{scaleVal}</span>
              <span>{max}</span>
            </div>
          </div>
        )
      }

      default:
        return (
          <Input
            value={String(val)}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        )
    }
  }

  return (
    <div className="space-y-1.5">
      {field.type !== 'CHECKBOX' && (
        <label className="text-sm font-medium">
          {field.label}
          {field.isRequired && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}
      {renderField()}
      {field.helpText && <p className="text-xs text-muted">{field.helpText}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
