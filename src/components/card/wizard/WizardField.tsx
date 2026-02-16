'use client'

import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'

interface Field {
  id: string
  label: string
  name: string
  type: string
  placeholder?: string | null
  helpText?: string | null
  isRequired: boolean
  options?: any
}

interface WizardFieldProps {
  field: Field
  value: string
  onChange: (value: string) => void
  error?: string
}

export function WizardField({ field, value, onChange, error }: WizardFieldProps) {
  const label = field.isRequired ? `${field.label} *` : field.label

  // Parse options if they exist
  let options: { value: string; label: string }[] = []
  if (field.options) {
    try {
      options = typeof field.options === 'string'
        ? JSON.parse(field.options)
        : field.options
    } catch (e) {
      console.error('Failed to parse field options:', e)
    }
  }

  const renderField = () => {
    switch (field.type) {
      case 'TEXT':
      case 'text':
        return (
          <Input
            id={field.id}
            type="text"
            label={label}
            placeholder={field.placeholder || ''}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
          />
        )

      case 'EMAIL':
      case 'email':
        return (
          <Input
            id={field.id}
            type="email"
            label={label}
            placeholder={field.placeholder || 'nome@esempio.it'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
          />
        )

      case 'PHONE':
      case 'phone':
        return (
          <Input
            id={field.id}
            type="tel"
            label={label}
            placeholder={field.placeholder || '+39 123 456 7890'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
          />
        )

      case 'NUMBER':
      case 'number':
        return (
          <Input
            id={field.id}
            type="number"
            label={label}
            placeholder={field.placeholder || ''}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
          />
        )

      case 'TEXTAREA':
      case 'textarea':
        return (
          <Textarea
            id={field.id}
            label={label}
            placeholder={field.placeholder || ''}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
            rows={4}
          />
        )

      case 'SELECT':
      case 'select':
        return (
          <Select
            id={field.id}
            label={label}
            options={[
              { value: '', label: field.placeholder || 'Seleziona...' },
              ...options
            ]}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
          />
        )

      case 'RADIO':
      case 'radio':
        return (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground mb-3">
              {label}
            </label>
            <div className="space-y-2">
              {options.map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/30 border-border/50"
                  />
                  <span className="text-sm text-foreground">{option.label}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>
        )

      case 'CHECKBOX':
      case 'checkbox':
        return (
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={value === 'true'}
                onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 text-primary focus:ring-2 focus:ring-primary/30 border-border/50 rounded"
              />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )

      case 'DATE':
      case 'date':
        return (
          <Input
            id={field.id}
            type="date"
            label={label}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
          />
        )

      case 'RATING':
      case 'rating':
        return (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground mb-3">
              {label}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onChange(rating.toString())}
                  className={`w-12 h-12 rounded-lg border-2 font-semibold transition-all ${
                    value === rating.toString()
                      ? 'border-primary bg-primary text-white'
                      : 'border-border/50 bg-card/50 text-muted hover:border-primary/50'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>
        )

      case 'SCALE':
      case 'scale':
        return (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground mb-3">
              {label}
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onChange(rating.toString())}
                  className={`w-10 h-10 rounded-lg border-2 font-semibold transition-all text-sm ${
                    value === rating.toString()
                      ? 'border-primary bg-primary text-white'
                      : 'border-border/50 bg-card/50 text-muted hover:border-primary/50'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
          </div>
        )

      default:
        // Fallback to text input
        return (
          <Input
            id={field.id}
            type="text"
            label={label}
            placeholder={field.placeholder || ''}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
          />
        )
    }
  }

  return (
    <div>
      {renderField()}
      {field.helpText && !error && (
        <p className="text-xs text-muted mt-1.5">{field.helpText}</p>
      )}
    </div>
  )
}
