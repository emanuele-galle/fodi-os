'use client'

import { useState } from 'react'
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
  companyName?: string
  phone?: string | null
}

export function WizardForm({ template, cardSlug, companyName, phone }: WizardFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const currentStep = template.steps[currentStepIndex]
  const isLastStep = currentStepIndex === template.steps.length - 1
  const isFirstStep = currentStepIndex === 0

  const handleFieldChange = (fieldName: string, value: string) => {
    setAnswers(prev => ({ ...prev, [fieldName]: value }))
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
    if (submitError) setSubmitError(null)
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
    setSubmitError(null)

    try {
      const name = answers.name || answers.nome || answers.full_name || ''
      const email = answers.email || ''
      const userPhone = answers.phone || answers.telefono || ''
      const company = answers.company || answers.azienda || ''

      const messageLines = Object.entries(answers).map(([key, value]) => {
        const field = template.steps.flatMap(s => s.fields).find(f => f.name === key)
        const label = field?.label || key
        return `${label}: ${value}`
      })
      const message = messageLines.join('\n')

      const leadResponse = await fetch(`/api/c/${cardSlug}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: userPhone,
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
      setSubmitError('Si è verificato un errore. Riprova.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <WizardSuccess
        message={template.completionMessage}
        companyName={companyName}
        cardSlug={cardSlug}
        phone={phone}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      {template.showProgressBar && (
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-[12px] text-white/30">
            <span>Passo {currentStepIndex + 1} di {template.steps.length}</span>
            <span>{Math.round(((currentStepIndex + 1) / template.steps.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${((currentStepIndex + 1) / template.steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step content */}
      <div>
        <h2 className="text-[16px] font-medium text-white/80 mb-1">{currentStep.title}</h2>
        {currentStep.description && (
          <p className="text-[13px] text-white/30 mb-6">{currentStep.description}</p>
        )}

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

      {/* Inline error */}
      {submitError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 text-[13px]">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {submitError}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 pt-2">
        {!isFirstStep && (
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="px-5 py-3 rounded-xl text-[13px] font-medium text-white/40 bg-white/[0.03] border border-white/[0.06] hover:text-white/60 hover:bg-white/[0.05] transition-all disabled:opacity-40"
          >
            Indietro
          </button>
        )}

        <div className={isFirstStep ? 'w-full' : 'flex-1'}>
          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="group relative w-full overflow-hidden flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white font-medium text-[14px] transition-all duration-300 hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin relative" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="relative">Invio in corso...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="relative">Invia</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 text-white font-medium text-[14px] transition-all duration-300 hover:brightness-110 active:scale-[0.99]"
            >
              Avanti
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
