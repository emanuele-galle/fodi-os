'use client'

import { useState, useEffect } from 'react'
import { FileText, Search, Check, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'

interface Template {
  id: string
  name: string
  description: string | null
  isGlobal: boolean
  primaryColor: string
  defaultTaxRate: string
  defaultValidDays: number
  client: { companyName: string } | null
  _count: { lineItems: number; quotes: number }
}

interface TemplateSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (templateId: string) => void
  clientId?: string
}

export function TemplateSelector({ open, onClose, onSelect, clientId }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch templates when dialog opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    const params = new URLSearchParams({ limit: '50', active: 'true' })
    if (search) params.set('search', search)
    fetch(`/api/quote-templates?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.items) setTemplates(d.items)
      })
      .finally(() => setLoading(false))
  }, [open, search])

  // Filter: show global templates + client-specific ones if clientId matches
  const filtered = templates.filter(
    (t) => t.isGlobal || (clientId && t.client && t.id === clientId)
  )

  return (
    <Modal open={open} onClose={onClose} title="Seleziona Template" size="lg">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted">Caricamento template...</div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="h-10 w-10 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">Nessun template disponibile</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="w-full text-left p-3 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: t.primaryColor }}
                      />
                      <span className="font-medium text-sm truncate">{t.name}</span>
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted mt-1 line-clamp-1">{t.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {t._count.lineItems} voci
                      </Badge>
                      <span className="text-[10px] text-muted">
                        IVA {parseFloat(t.defaultTaxRate)}% | {t.defaultValidDays}gg validità
                      </span>
                    </div>
                  </div>
                  <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-border/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Chiudi
          </Button>
        </div>
      </div>
    </Modal>
  )
}
