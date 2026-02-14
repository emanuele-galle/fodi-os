'use client'

import { useState } from 'react'
import { WizardField } from './WizardField'
import { evaluateCondition, type WizardCondition } from '@/lib/wizard-conditions'
import { Button } from '@/components/ui/Button'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

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

interface WizardPreviewProps {
  name: string
  steps: StepDef[]
  showProgressBar: boolean
  completionMessage?: string | null
}

export function WizardPreview({ name, steps, showProgressBar, completionMessage }: WizardPreviewProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [completed, setCompleted] = useState(false)

  // Filter visible steps based on conditions
  const visibleSteps = steps.filter((s) =>
    evaluateCondition(s.condition as WizardCondition | null, answers)
  )

  const step = visibleSteps[currentStep]
  const visibleFields = step?.fields.filter((f) =>
    evaluateCondition(f.condition as WizardCondition | null, answers)
  ) || []

  const handleFieldChange = (name: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [name]: value }))
  }

  const goNext = () => {
    if (currentStep < visibleSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setCompleted(true)
    }
  }

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const reset = () => {
    setCurrentStep(0)
    setAnswers({})
    setCompleted(false)
  }

  if (steps.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p>Aggiungi almeno uno step per vedere l&apos;anteprima</p>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Wizard completato!</h3>
        <p className="text-sm text-muted mb-4">
          {completionMessage || 'Grazie per aver completato il questionario.'}
        </p>
        <Button variant="outline" onClick={reset}>Ricomincia</Button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <h3 className="text-lg font-semibold mb-4">{name}</h3>

      {showProgressBar && visibleSteps.length > 1 && (
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

      {step && (
        <div>
          <h4 className="font-semibold mb-1">{step.title}</h4>
          {step.description && <p className="text-sm text-muted mb-4">{step.description}</p>}

          <div className="space-y-4 mb-6">
            {visibleFields.map((field) => (
              <WizardField
                key={field.id}
                field={field}
                value={answers[field.name]}
                onChange={handleFieldChange}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Indietro
            </Button>
            <Button onClick={goNext}>
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
      )}
    </div>
  )
}
