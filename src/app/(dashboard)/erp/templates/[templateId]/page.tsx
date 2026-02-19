'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Copy, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { TemplateEditor, type TemplateFormData } from '@/components/erp/TemplateEditor'
import { TemplatePreview } from '@/components/erp/TemplatePreview'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface Client {
  id: string
  companyName: string
}

interface TemplateDetail {
  id: string
  name: string
  slug: string
  description: string | null
  isGlobal: boolean
  isActive: boolean
  clientId: string | null
  creatorId: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  headerHtml: string | null
  footerHtml: string | null
  sections: unknown
  numberPrefix: string
  numberFormat: string
  defaultTaxRate: string
  defaultDiscount: string
  defaultNotes: string | null
  defaultValidDays: number
  termsAndConditions: string | null
  createdAt: string
  updatedAt: string
  client: { id: string; companyName: string } | null
  lineItems: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: string
    sortOrder: number
  }>
  _count: { quotes: number }
}

export default function TemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.templateId as string

  const [template, setTemplate] = useState<TemplateDetail | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const { confirm, confirmProps } = useConfirm()

  const fetchTemplate = useCallback(async () => {
    try {
      const res = await fetch(`/api/quote-templates/${templateId}`)
      if (res.ok) {
        const json = await res.json()
        setTemplate(json.data || json)
      }
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchTemplate()
    fetch('/api/clients?limit=200')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.items) setClients(d.items)
      })
  }, [fetchTemplate])

  async function handleSubmit(data: TemplateFormData) {
    setSubmitting(true)
    try {
      const body = {
        ...data,
        clientId: data.clientId || null,
        logoUrl: data.logoUrl || null,
        headerHtml: data.headerHtml || null,
        footerHtml: data.footerHtml || null,
        defaultNotes: data.defaultNotes || null,
        termsAndConditions: data.termsAndConditions || null,
      }
      const res = await fetch(`/api/quote-templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setTemplate(await res.json())
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDuplicate() {
    const res = await fetch(`/api/quote-templates/${templateId}/duplicate`, { method: 'POST' })
    if (res.ok) {
      const json = await res.json()
      router.push(`/erp/templates/${json.data?.id || json.id}`)
    }
  }

  async function handleDelete() {
    const ok = await confirm({ message: 'Sei sicuro di voler eliminare questo template?', variant: 'danger' })
    if (!ok) return
    const res = await fetch(`/api/quote-templates/${templateId}`, { method: 'DELETE' })
    if (res.ok) router.push('/erp/templates')
  }

  async function handleToggleActive() {
    if (!template) return
    const res = await fetch(`/api/quote-templates/${templateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !template.isActive }),
    })
    if (res.ok) {
      setTemplate(await res.json())
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Template non trovato.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/erp/templates')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
      </div>
    )
  }

  const initialData: Partial<TemplateFormData> = {
    name: template.name,
    description: template.description || '',
    isGlobal: template.isGlobal,
    clientId: template.clientId || '',
    logoUrl: template.logoUrl || '',
    primaryColor: template.primaryColor,
    secondaryColor: template.secondaryColor,
    headerHtml: template.headerHtml || '',
    footerHtml: template.footerHtml || '',
    numberPrefix: template.numberPrefix,
    numberFormat: template.numberFormat,
    defaultTaxRate: parseFloat(template.defaultTaxRate),
    defaultDiscount: parseFloat(template.defaultDiscount),
    defaultNotes: template.defaultNotes || '',
    defaultValidDays: template.defaultValidDays,
    termsAndConditions: template.termsAndConditions || '',
    lineItems: template.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
      sortOrder: item.sortOrder,
    })),
  }

  return (
    <div>
      <button
        onClick={() => router.push('/erp/templates')}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Torna ai template
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: template.primaryColor }} />
            <h1 className="text-xl sm:text-2xl font-semibold">{template.name}</h1>
            <Badge variant={template.isActive ? 'success' : 'outline'}>
              {template.isActive ? 'Attivo' : 'Disattivato'}
            </Badge>
          </div>
          {template.description && <p className="text-muted mt-1">{template.description}</p>}
          <p className="text-xs text-muted mt-1">{template._count.quotes} preventivi creati da questo template</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="hidden xl:flex">
            {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showPreview ? 'Nascondi' : 'Mostra'} anteprima
          </Button>
          <Button variant="outline" size="sm" onClick={handleToggleActive}>
            {template.isActive ? 'Disattiva' : 'Attiva'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate}>
            <Copy className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Duplica</span>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Elimina</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className={showPreview ? 'xl:col-span-2' : 'xl:col-span-3'}>
          <TemplateEditor
            initialData={initialData}
            clients={clients}
            onSubmit={handleSubmit}
            submitLabel="Salva Modifiche"
            submitting={submitting}
          />
        </div>
        {showPreview && (
          <div className="hidden xl:block">
            <div className="sticky top-6">
              <p className="text-sm font-medium text-muted mb-3">Anteprima PDF</p>
              <TemplatePreview
                name={template.name}
                primaryColor={template.primaryColor}
                secondaryColor={template.secondaryColor}
                numberPrefix={template.numberPrefix}
                numberFormat={template.numberFormat}
                defaultTaxRate={parseFloat(template.defaultTaxRate)}
                defaultDiscount={parseFloat(template.defaultDiscount)}
                defaultNotes={template.defaultNotes || ''}
                termsAndConditions={template.termsAndConditions || ''}
                lineItems={template.lineItems.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: parseFloat(item.unitPrice),
                  sortOrder: item.sortOrder,
                }))}
              />
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
