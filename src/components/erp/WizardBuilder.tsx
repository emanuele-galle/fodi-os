'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { StepEditor } from './StepEditor'
import { WizardPreview } from './WizardPreview'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'
import {
  ArrowLeft, Plus, Save, Globe, GlobeLock, Copy, Trash2,
} from 'lucide-react'

interface FieldOption { label: string; value: string }
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
interface WizardStepData {
  id?: string
  title: string
  description: string
  sortOrder: number
  condition: { fieldId: string; operator: string; value: string } | null
  fields: WizardFieldData[]
}
interface WizardData {
  id: string
  name: string
  slug: string
  description: string | null
  category: string
  isSystem: boolean
  status: string
  allowSaveProgress: boolean
  showProgressBar: boolean
  completionMessage: string | null
  steps: WizardStepData[]
  _count: { submissions: number }
}

interface WizardBuilderProps {
  wizardId: string
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza',
  PUBLISHED: 'Pubblicato',
  ARCHIVED: 'Archiviato',
}

export function WizardBuilder({ wizardId }: WizardBuilderProps) {
  const router = useRouter()
  const [wizard, setWizard] = useState<WizardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { confirm, confirmProps } = useConfirm()

  // Editable header fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const [showProgressBar, setShowProgressBar] = useState(true)
  const [allowSaveProgress, setAllowSaveProgress] = useState(true)

  const fetchWizard = useCallback(async () => {
    try {
      const res = await fetch(`/api/wizards/${wizardId}`)
      if (res.ok) {
        const data = await res.json()
        setWizard(data)
        setName(data.name)
        setDescription(data.description || '')
        setCompletionMessage(data.completionMessage || '')
        setShowProgressBar(data.showProgressBar)
        setAllowSaveProgress(data.allowSaveProgress)
      }
    } finally {
      setLoading(false)
    }
  }, [wizardId])

  useEffect(() => { fetchWizard() }, [fetchWizard])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await fetch(`/api/wizards/${wizardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          completionMessage: completionMessage || null,
          showProgressBar,
          allowSaveProgress,
        }),
      })
      await fetchWizard()
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async () => {
    await fetch(`/api/wizards/${wizardId}/publish`, { method: 'PATCH' })
    await fetchWizard()
  }

  const duplicateWizard = async () => {
    const res = await fetch(`/api/wizards/${wizardId}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      router.push(`/erp/wizards/${data.id}`)
    }
  }

  const deleteWizard = async () => {
    const ok = await confirm({ message: 'Eliminare questo wizard e tutti i suoi dati?', variant: 'danger' })
    if (!ok) return
    await fetch(`/api/wizards/${wizardId}`, { method: 'DELETE' })
    router.push('/erp/wizards')
  }

  const addStep = async () => {
    await fetch(`/api/wizards/${wizardId}/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Step ${(wizard?.steps.length ?? 0) + 1}`, sortOrder: wizard?.steps.length ?? 0 }),
    })
    await fetchWizard()
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!wizard) {
    return <p className="text-center py-12 text-muted">Wizard non trovato</p>
  }

  // Compute available fields per step for conditions
  const getFieldsBeforeStep = (stepIndex: number) => {
    const fields: { id: string; name: string; label: string }[] = []
    for (let i = 0; i < stepIndex; i++) {
      for (const f of wizard.steps[i]?.fields || []) {
        if (f.id) fields.push({ id: f.id, name: f.name, label: f.label })
      }
    }
    return fields
  }

  const stepsContent = (
    <div className="space-y-3">
      {wizard.steps.map((step, i) => (
        <StepEditor
          key={step.id || `new-${i}`}
          step={{
            ...step,
            description: step.description || '',
            fields: step.fields.map((f) => ({
              ...f,
              placeholder: (f as unknown as { placeholder?: string }).placeholder || '',
              helpText: (f as unknown as { helpText?: string }).helpText || '',
              defaultValue: (f as unknown as { defaultValue?: string }).defaultValue || '',
            })),
          }}
          index={i}
          wizardId={wizardId}
          onUpdate={fetchWizard}
          onDelete={fetchWizard}
          allFieldsFromPreviousSteps={getFieldsBeforeStep(i)}
        />
      ))}

      <Button variant="outline" onClick={addStep} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-2" />
        Aggiungi step
      </Button>
    </div>
  )

  const settingsContent = (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="text-sm font-medium mb-1 block">Nome wizard *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Descrizione</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border/60 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
          placeholder="Descrizione del wizard..."
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Messaggio di completamento</label>
        <textarea
          value={completionMessage}
          onChange={(e) => setCompletionMessage(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border/60 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
          placeholder="Grazie per aver completato il questionario..."
        />
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showProgressBar}
            onChange={(e) => setShowProgressBar(e.target.checked)}
            className="rounded border-border"
          />
          Mostra barra di avanzamento
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={allowSaveProgress}
            onChange={(e) => setAllowSaveProgress(e.target.checked)}
            className="rounded border-border"
          />
          Permetti salvataggio progresso
        </label>
      </div>
      <Button onClick={saveSettings} loading={saving} disabled={!name}>
        <Save className="h-4 w-4 mr-1" />
        Salva impostazioni
      </Button>
    </div>
  )

  const previewContent = (
    <WizardPreview
      name={wizard.name}
      steps={wizard.steps as unknown as Parameters<typeof WizardPreview>[0]['steps']}
      showProgressBar={wizard.showProgressBar}
      completionMessage={wizard.completionMessage}
    />
  )

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.push('/erp/wizards')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl md:text-2xl font-bold truncate">{wizard.name}</h1>
            <Badge status={wizard.status}>
              {STATUS_LABELS[wizard.status] || wizard.status}
            </Badge>
            {wizard.isSystem && <Badge variant="outline">Sistema</Badge>}
          </div>
          <p className="text-xs text-muted">
            {wizard.steps.length} step &middot; {wizard._count.submissions} compilazioni
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Button variant="outline" size="sm" onClick={duplicateWizard}>
            <Copy className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Duplica</span>
          </Button>
          <Button
            variant={wizard.status === 'PUBLISHED' ? 'outline' : 'primary'}
            size="sm"
            onClick={togglePublish}
            disabled={wizard.steps.length === 0}
          >
            {wizard.status === 'PUBLISHED' ? (
              <>
                <GlobeLock className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Disattiva</span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Pubblica</span>
              </>
            )}
          </Button>
          {!wizard.isSystem && (
            <Button variant="destructive" size="sm" onClick={deleteWizard}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog {...confirmProps} />

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'steps', label: `Steps (${wizard.steps.length})`, content: stepsContent },
          { id: 'preview', label: 'Anteprima', content: previewContent },
          { id: 'settings', label: 'Impostazioni', content: settingsContent },
        ]}
        defaultTab="steps"
      />
    </div>
  )
}
