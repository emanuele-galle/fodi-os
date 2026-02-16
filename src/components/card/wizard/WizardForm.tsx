'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { WizardField } from './WizardField'
import { WizardSuccess } from './WizardSuccess'

interface Field {
  id: string
  label: string
  name: string
  type: string
  placeholder?: string | null
  helpText?: string | null
  isRequired: boolean
  sortOrder: number
  options?: any
  validation?: any
  defaultValue?: string | null
}

interface Step {
  id: string
  title: string
  description?: string | null
  sortOrder: number
  fields: Field[]
}

interface Template {
  id: string
  name: string
  slug: string
  showProgressBar: boolean
  completionMessage?: string | null
  steps: Step[]
}

interface WizardFormProps {
  template: Template
  cardSlug: string
}

export function WizardForm({ template, cardSlug }: WizardFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const currentStep = template.steps[currentStepIndex]
  const isLastStep = currentStepIndex === template.steps.length - 1
  const isFirstStep = currentStepIndex === 0

  const handleFieldChange = (fieldName: string, value: string) => {
    setAnswers(prev => ({ ...prev, [fieldName]: value }))
    // Clear error when user types
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {}

    currentStep.fields.forEach(field => {
      if (field.isRequired && !answers[field.name]?.trim()) {
        newErrors[field.name] = 'Questo campo è obbligatorio'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStepIndex(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    setCurrentStepIndex(prev => prev - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return

    setIsSubmitting(true)

    try {
      // Map answers to lead fields
      const name = answers.name || answers.nome || answers.full_name || ''
      const email = answers.email || ''
      const phone = answers.phone || answers.telefono || ''
      const company = answers.company || answers.azienda || ''

      // Combine all answers into message
      const messageLines = Object.entries(answers).map(([key, value]) => {
        const field = template.steps.flatMap(s => s.fields).find(f => f.name === key)
        const label = field?.label || key
        return `${label}: ${value}`
      })
      const message = messageLines.join('\n')

      // Submit lead
      const leadResponse = await fetch(`/api/c/${cardSlug}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
          message,
          source: `wizard:${template.slug}`
        })
      })

      if (!leadResponse.ok) {
        throw new Error('Failed to submit lead')
      }

      setIsSuccess(true)
    } catch (error) {
      console.error('Submit error:', error)
      alert('Si è verificato un errore. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return <WizardSuccess message={template.completionMessage} />
  }

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      {template.showProgressBar && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-muted">
            <span>Passo {currentStepIndex + 1} di {template.steps.length}</span>
            <span>{Math.round(((currentStepIndex + 1) / template.steps.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${((currentStepIndex + 1) / template.steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step content */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">{currentStep.title}</h2>
        {currentStep.description && (
          <p className="text-sm text-muted mb-6">{currentStep.description}</p>
        )}

        {/* Fields */}
        <div className="space-y-5">
          {currentStep.fields.map(field => (
            <WizardField
              key={field.id}
              field={field}
              value={answers[field.name] || ''}
              onChange={(value) => handleFieldChange(field.name, value)}
              error={errors[field.name]}
            />
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border/30">
        <div>
          {!isFirstStep && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Indietro
            </Button>
          )}
        </div>

        <div>
          {isLastStep ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Invia
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
            >
              Avanti
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
