'use client'

import { useState, useCallback, useEffect } from 'react'
import { WizardField } from './WizardField'
import { evaluateCondition, type WizardCondition } from '@/lib/wizard-conditions'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'

interface FieldDef {
  id: string
  label: string
  name: string
  type: string
  placeholder?: string | null
  helpText?: string | null
  isRequired: boolean
  options?: { label: string; value: string }[] | null
  validation?: { min?: number; max?: number; minLength?: number; maxLength?: number } | null
  defaultValue?: string | null
  condition?: WizardCondition | null
}

interface StepDef {
  id: string
  title: string
  description?: string | null
  condition?: WizardCondition | null
  fields: FieldDef[]
}

interface TemplateDef {
  id: string
  name: string
  showProgressBar: boolean
  allowSaveProgress: boolean
  completionMessage?: string | null
  steps: StepDef[]
}

interface WizardRunnerProps {
  template: TemplateDef
  submissionId: string
  initialAnswers?: Record<string, unknown>
  initialStep?: number
  onComplete?: () => void
  apiBase?: string
}

export function WizardRunner({
  template,
  submissionId,
  initialAnswers = {},
  initialStep = 0,
  onComplete,
  apiBase = '/api/wizard-submissions',
}: WizardRunnerProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [completionError, setCompletionError] = useState<string | null>(null)

  const visibleSteps = template.steps.filter((s) =>
    evaluateCondition(s.condition as WizardCondition | null, answers)
  )

  const step = visibleSteps[currentStep]
  const visibleFields = step?.fields.filter((f) =>
    evaluateCondition(f.condition as WizardCondition | null, answers)
  ) || []

  const handleFieldChange = (name: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    for (const field of visibleFields) {
      if (!field.isRequired) continue
      const val = answers[field.name]
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        newErrors[field.name] = 'Campo obbligatorio'
      }
    }

    // Additional validations
    for (const field of visibleFields) {
      const val = answers[field.name]
      if (!val && !field.isRequired) continue

      if (field.type === 'EMAIL' && val) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(String(val))) {
          newErrors[field.name] = 'Email non valida'
        }
      }

      if (field.validation) {
        const v = field.validation
        if (field.type === 'NUMBER' || field.type === 'SCALE' || field.type === 'RATING') {
          const num = Number(val)
          if (v.min !== undefined && num < v.min) newErrors[field.name] = `Valore minimo: ${v.min}`
          if (v.max !== undefined && num > v.max) newErrors[field.name] = `Valore massimo: ${v.max}`
        }
        if (typeof val === 'string') {
          if (v.minLength && val.length < v.minLength) newErrors[field.name] = `Minimo ${v.minLength} caratteri`
          if (v.maxLength && val.length > v.maxLength) newErrors[field.name] = `Massimo ${v.maxLength} caratteri`
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [visibleFields, answers])

  const saveProgress = useCallback(async (nextStep: number) => {
    setSaving(true)
    try {
      await fetch(`${apiBase}/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStep: nextStep, answers }),
      })
    } finally {
      setSaving(false)
    }
  }, [apiBase, submissionId, answers])

  const goNext = async () => {
    if (!validateStep()) return

    if (currentStep < visibleSteps.length - 1) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      if (template.allowSaveProgress) {
        await saveProgress(nextStep)
      }
    } else {
      // Complete
      setSaving(true)
      setCompletionError(null)
      try {
        const res = await fetch(`${apiBase}/${submissionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentStep, answers, status: 'COMPLETED' }),
        })
        if (!res.ok) throw new Error('save failed')
        const completeRes = await fetch(`${apiBase}/${submissionId}/complete`, { method: 'POST' })
        if (!completeRes.ok) throw new Error('complete failed')
        setCompleted(true)
        onComplete?.()
      } catch {
        setCompletionError('Errore durante il salvataggio. Riprova.')
      } finally {
        setSaving(false)
      }
    }
  }

  const goPrev = async () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      if (template.allowSaveProgress) {
        await saveProgress(prevStep)
      }
    }
  }

  if (completed) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Completato!</h3>
        <p className="text-sm text-muted">
          {template.completionMessage || 'Grazie per aver completato il questionario.'}
        </p>
      </div>
    )
  }

  if (!step) return null

  return (
    <div className="max-w-xl mx-auto">
      {template.showProgressBar && visibleSteps.length > 1 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted mb-1.5">
            <span>Step {currentStep + 1} di {visibleSteps.length}</span>
            <span>{Math.round(((currentStep + 1) / visibleSteps.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep + 1) / visibleSteps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <h4 className="font-semibold text-lg mb-1">{step.title}</h4>
      {step.description && <p className="text-sm text-muted mb-4">{step.description}</p>}

      <div className="space-y-4 mb-6">
        {visibleFields.map((field) => (
          <WizardField
            key={field.id}
            field={field}
            value={answers[field.name]}
            onChange={handleFieldChange}
            error={errors[field.name]}
          />
        ))}
      </div>

      {completionError && (
        <div className="mb-4 p-3 rounded-md text-sm bg-destructive/10 text-destructive border border-destructive/20">
          {completionError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentStep === 0 || saving}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Indietro
        </Button>
        <Button onClick={goNext} loading={saving}>
          {currentStep === visibleSteps.length - 1 ? (
            <>
              Completa
              <Check className="h-4 w-4 ml-1" />
            </>
          ) : (
            <>
              Avanti
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
