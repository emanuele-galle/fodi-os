'use client'

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

const inputBase = 'w-full h-12 px-4 text-base bg-white/80 dark:bg-white/[0.04] backdrop-blur-sm border border-border/40 rounded-xl transition-all outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 placeholder:text-muted-foreground/50'
const labelBase = 'block text-sm font-medium text-foreground mb-2'
const errorBase = 'text-xs text-red-500 mt-1.5'

export function WizardField({ field, value, onChange, error }: WizardFieldProps) {
  const label = field.isRequired ? `${field.label} *` : field.label

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

  const errorBorder = error ? 'border-red-500/50 focus:ring-red-500/30' : ''

  const renderField = () => {
    switch (field.type) {
      case 'TEXT':
      case 'text':
        return (
          <div>
            <label htmlFor={field.id} className={labelBase}>{label}</label>
            <input
              id={field.id}
              type="text"
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputBase} ${errorBorder}`}
            />
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )

      case 'EMAIL':
      case 'email':
        return (
          <div>
            <label htmlFor={field.id} className={labelBase}>{label}</label>
            <input
              id={field.id}
              type="email"
              placeholder={field.placeholder || 'nome@esempio.it'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputBase} ${errorBorder}`}
            />
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )

      case 'PHONE':
      case 'phone':
        return (
          <div>
            <label htmlFor={field.id} className={labelBase}>{label}</label>
            <input
              id={field.id}
              type="tel"
              placeholder={field.placeholder || '+39 123 456 7890'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputBase} ${errorBorder}`}
            />
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )

      case 'NUMBER':
      case 'number':
        return (
          <div>
            <label htmlFor={field.id} className={labelBase}>{label}</label>
            <input
              id={field.id}
              type="number"
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputBase} ${errorBorder}`}
            />
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )

      case 'TEXTAREA':
      case 'textarea':
        return (
          <div>
            <label htmlFor={field.id} className={labelBase}>{label}</label>
            <textarea
              id={field.id}
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={4}
              className={`w-full min-h-[120px] px-4 py-3 text-base bg-white/80 dark:bg-white/[0.04] backdrop-blur-sm border border-border/40 rounded-xl transition-all outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 placeholder:text-muted-foreground/50 resize-y ${errorBorder}`}
            />
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )

      case 'SELECT':
      case 'select':
        return (
          <div>
            <label htmlFor={field.id} className={labelBase}>{label}</label>
            <select
              id={field.id}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputBase} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10 ${errorBorder}`}
            >
              <option value="">{field.placeholder || 'Seleziona...'}</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )

      case 'RADIO':
      case 'radio':
        return (
          <div>
            <label className={labelBase}>{label}</label>
            <div className="space-y-2">
              {options.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 cursor-pointer py-3 px-4 rounded-xl border transition-all ${
                    value === option.value
                      ? 'border-purple-500/50 bg-purple-500/5'
                      : 'border-border/30 bg-white/60 dark:bg-white/[0.03] hover:border-border/60'
                  }`}
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-2 focus:ring-purple-500/30 border-border/50"
                  />
                  <span className="text-sm text-foreground">{option.label}</span>
                </label>
              ))}
            </div>
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )

      case 'CHECKBOX':
      case 'checkbox':
        return (
          <div>
            <label
              className={`flex items-center gap-3 cursor-pointer py-3 px-4 rounded-xl border transition-all ${
                value === 'true'
                  ? 'border-purple-500/50 bg-purple-500/5'
                  : 'border-border/30 bg-white/60 dark:bg-white/[0.03] hover:border-border/60'
              }`}
            >
              <input
                type="checkbox"
                checked={value === 'true'}
                onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 text-purple-600 focus:ring-2 focus:ring-purple-500/30 border-border/50 rounded"
              />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </label>
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )

      case 'DATE':
      case 'date':
        return (
          <div>
            <label htmlFor={field.id} className={labelBase}>{label}</label>
            <input
              id={field.id}
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputBase} ${errorBorder}`}
            />
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )

      case 'RATING':
      case 'rating':
        return (
          <div>
            <label className={labelBase}>{label}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onChange(rating.toString())}
                  className={`w-12 h-12 rounded-xl border-2 font-semibold transition-all text-base ${
                    value === rating.toString()
                      ? 'border-purple-500 bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                      : 'border-border/40 bg-white/80 dark:bg-white/[0.04] text-muted-foreground hover:border-purple-500/50'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )

      case 'SCALE':
      case 'scale':
        return (
          <div>
            <label className={labelBase}>{label}</label>
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => onChange(rating.toString())}
                  className={`w-10 h-10 rounded-lg border-2 font-semibold transition-all text-sm ${
                    value === rating.toString()
                      ? 'border-purple-500 bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                      : 'border-border/40 bg-white/80 dark:bg-white/[0.04] text-muted-foreground hover:border-purple-500/50'
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )

      default:
        return (
          <div>
            <label htmlFor={field.id} className={labelBase}>{label}</label>
            <input
              id={field.id}
              type="text"
              placeholder={field.placeholder || ''}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputBase} ${errorBorder}`}
            />
            {error && <p className={errorBase}>{error}</p>}
          </div>
        )
    }
  }

  return (
    <div>
      {renderField()}
      {field.helpText && !error && (
        <p className="text-xs text-muted-foreground mt-1.5">{field.helpText}</p>
      )}
    </div>
  )
}
