'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TemplateLineItemsEditor, type TemplateLineItem } from './TemplateLineItemsEditor'

export interface TemplateFormData {
  name: string
  description: string
  isGlobal: boolean
  clientId: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  headerHtml: string
  footerHtml: string
  numberPrefix: string
  numberFormat: string
  defaultTaxRate: number
  defaultDiscount: number
  defaultNotes: string
  defaultValidDays: number
  termsAndConditions: string
  lineItems: TemplateLineItem[]
}

interface Client {
  id: string
  companyName: string
}

interface TemplateEditorProps {
  initialData?: Partial<TemplateFormData>
  clients: Client[]
  onSubmit: (data: TemplateFormData) => Promise<void>
  submitLabel: string
  submitting: boolean
}

const SCOPE_OPTIONS = [
  { value: 'true', label: 'Globale (tutti i clienti)' },
  { value: 'false', label: 'Specifico per un cliente' },
]

export function TemplateEditor({ initialData, clients, onSubmit, submitLabel, submitting }: TemplateEditorProps) {
  const [form, setForm] = useState<TemplateFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    isGlobal: initialData?.isGlobal ?? true,
    clientId: initialData?.clientId || '',
    logoUrl: initialData?.logoUrl || '',
    primaryColor: initialData?.primaryColor || '#3B82F6',
    secondaryColor: initialData?.secondaryColor || '#1E293B',
    headerHtml: initialData?.headerHtml || '',
    footerHtml: initialData?.footerHtml || '',
    numberPrefix: initialData?.numberPrefix || 'Q',
    numberFormat: initialData?.numberFormat || '{PREFIX}-{YYYY}-{NNN}',
    defaultTaxRate: initialData?.defaultTaxRate ?? 22,
    defaultDiscount: initialData?.defaultDiscount ?? 0,
    defaultNotes: initialData?.defaultNotes || '',
    defaultValidDays: initialData?.defaultValidDays ?? 30,
    termsAndConditions: initialData?.termsAndConditions || '',
    lineItems: initialData?.lineItems || [],
  })

  function updateField<K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit(form)
  }

  const clientOptions = [
    { value: '', label: 'Seleziona cliente...' },
    ...clients.map((c) => ({ value: c.id, label: c.companyName })),
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Info */}
      <Card>
        <CardContent>
          <CardTitle className="mb-4">Informazioni Generali</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome Template *"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="es. Sviluppo Web Standard"
              required
            />
            <Input
              label="Descrizione"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Breve descrizione del template"
            />
            <Select
              label="Visibilita"
              options={SCOPE_OPTIONS}
              value={String(form.isGlobal)}
              onChange={(e) => {
                const isGlobal = e.target.value === 'true'
                updateField('isGlobal', isGlobal)
                if (isGlobal) updateField('clientId', '')
              }}
            />
            {!form.isGlobal && (
              <Select
                label="Cliente"
                options={clientOptions}
                value={form.clientId}
                onChange={(e) => updateField('clientId', e.target.value)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardContent>
          <CardTitle className="mb-4">Branding</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="URL Logo"
              type="url"
              value={form.logoUrl}
              onChange={(e) => updateField('logoUrl', e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Colore Primario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="h-10 w-12 rounded border border-border/50 cursor-pointer"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => updateField('primaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Colore Secondario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => updateField('secondaryColor', e.target.value)}
                    className="h-10 w-12 rounded border border-border/50 cursor-pointer"
                  />
                  <Input
                    value={form.secondaryColor}
                    onChange={(e) => updateField('secondaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Numbering & Defaults */}
      <Card>
        <CardContent>
          <CardTitle className="mb-4">Numerazione e Valori Predefiniti</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Prefisso Numero"
              value={form.numberPrefix}
              onChange={(e) => updateField('numberPrefix', e.target.value)}
              placeholder="Q"
            />
            <Input
              label="Formato Numero"
              value={form.numberFormat}
              onChange={(e) => updateField('numberFormat', e.target.value)}
              placeholder="{PREFIX}-{YYYY}-{NNN}"
            />
            <Input
              label="Giorni Validita"
              type="number"
              min={1}
              max={365}
              value={form.defaultValidDays}
              onChange={(e) => updateField('defaultValidDays', parseInt(e.target.value) || 30)}
            />
            <Input
              label="IVA Predefinita %"
              type="number"
              min={0}
              max={100}
              value={form.defaultTaxRate}
              onChange={(e) => updateField('defaultTaxRate', parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Sconto Predefinito (EUR)"
              type="number"
              step="0.01"
              min={0}
              value={form.defaultDiscount}
              onChange={(e) => updateField('defaultDiscount', parseFloat(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardContent>
          <CardTitle className="mb-4">Voci Preventivo</CardTitle>
          <TemplateLineItemsEditor
            items={form.lineItems}
            onChange={(items) => updateField('lineItems', items)}
          />
        </CardContent>
      </Card>

      {/* Notes & Terms */}
      <Card>
        <CardContent>
          <CardTitle className="mb-4">Note e Condizioni</CardTitle>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Note Predefinite</label>
              <textarea
                value={form.defaultNotes}
                onChange={(e) => updateField('defaultNotes', e.target.value)}
                placeholder="Note predefinite da includere nel preventivo..."
                rows={3}
                className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Termini e Condizioni</label>
              <textarea
                value={form.termsAndConditions}
                onChange={(e) => updateField('termsAndConditions', e.target.value)}
                placeholder="Termini e condizioni da includere nel PDF..."
                rows={4}
                className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={submitting || !form.name}>
          {submitting ? 'Salvataggio...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
