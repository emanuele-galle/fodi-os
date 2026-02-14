'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { TemplateEditor, type TemplateFormData } from '@/components/erp/TemplateEditor'
import { TemplatePreview } from '@/components/erp/TemplatePreview'

interface Client {
  id: string
  companyName: string
}

export default function NewTemplatePage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [previewData, setPreviewData] = useState<Partial<TemplateFormData>>({})

  useEffect(() => {
    fetch('/api/clients?limit=200')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.items) setClients(d.items)
      })
  }, [])

  async function handleSubmit(data: TemplateFormData) {
    setSubmitting(true)
    try {
      const body = {
        ...data,
        clientId: data.clientId || undefined,
        logoUrl: data.logoUrl || undefined,
        headerHtml: data.headerHtml || undefined,
        footerHtml: data.footerHtml || undefined,
        defaultNotes: data.defaultNotes || undefined,
        termsAndConditions: data.termsAndConditions || undefined,
      }
      const res = await fetch('/api/quote-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        router.push(`/erp/templates/${created.id}`)
      }
    } finally {
      setSubmitting(false)
    }
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

      <h1 className="text-2xl font-semibold mb-6">Nuovo Template</h1>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TemplateEditor
            clients={clients}
            onSubmit={handleSubmit}
            submitLabel="Crea Template"
            submitting={submitting}
          />
        </div>
        <div className="hidden xl:block">
          <div className="sticky top-6">
            <p className="text-sm font-medium text-muted mb-3">Anteprima PDF</p>
            <TemplatePreview
              name={previewData.name || ''}
              primaryColor={previewData.primaryColor || '#3B82F6'}
              secondaryColor={previewData.secondaryColor || '#1E293B'}
              numberPrefix={previewData.numberPrefix || 'Q'}
              numberFormat={previewData.numberFormat || '{PREFIX}-{YYYY}-{NNN}'}
              defaultTaxRate={previewData.defaultTaxRate ?? 22}
              defaultDiscount={previewData.defaultDiscount ?? 0}
              defaultNotes={previewData.defaultNotes || ''}
              termsAndConditions={previewData.termsAndConditions || ''}
              lineItems={previewData.lineItems || []}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
