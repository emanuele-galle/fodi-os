'use client'

import { useState, useRef } from 'react'
import { useFormPersist } from '@/hooks/useFormPersist'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { STATUS_OPTIONS, INDUSTRY_OPTIONS, SOURCE_OPTIONS } from '@/lib/crm-constants'

interface Client {
  id: string
  companyName: string
}

interface CreateClientModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateClientModal({ open, onClose, onCreated }: CreateClientModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const duplicateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clientForm = useFormPersist('new-client', {
    companyName: '',
    vatNumber: '',
    fiscalCode: '',
    pec: '',
    sdi: '',
    website: '',
    industry: '',
    source: '',
    status: 'LEAD',
    notes: '',
  })

  function checkDuplicate(name: string) {
    if (duplicateTimer.current) clearTimeout(duplicateTimer.current)
    if (!name.trim() || name.trim().length < 3) {
      setDuplicateWarning(null)
      return
    }
    duplicateTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(name.trim())}&limit=3`)
        if (res.ok) {
          const data = await res.json()
          const matches = (data.items || []) as Client[]
          if (matches.length > 0) {
            const names = matches.map((m: Client) => m.companyName).join(', ')
            setDuplicateWarning(`Clienti simili trovati: ${names}`)
          } else {
            setDuplicateWarning(null)
          }
        }
      } catch { /* ignore */ }
    }, 500)
  }

  async function handleCreateClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const body: Record<string, string> = {}
    for (const [k, v] of Object.entries(clientForm.values)) {
      if (typeof v === 'string' && v.trim()) body[k] = v.trim()
    }
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        clientForm.reset()
        setDuplicateWarning(null)
        onClose()
        onCreated()
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setDuplicateWarning(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nuovo Cliente" size="lg">
      <form onSubmit={handleCreateClient} className="space-y-4">
        {clientForm.hasPersistedData && (
          <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            <span>Bozza recuperata</span>
            <button type="button" onClick={clientForm.reset} className="underline hover:no-underline">Scarta bozza</button>
          </div>
        )}
        <div>
          <Input
            label="Ragione Sociale *"
            required
            value={clientForm.values.companyName}
            onChange={(e) => {
              clientForm.setValue('companyName', e.target.value)
              checkDuplicate(e.target.value)
            }}
          />
          {duplicateWarning && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="P.IVA" value={clientForm.values.vatNumber} onChange={(e) => clientForm.setValue('vatNumber', e.target.value)} />
          <Input label="Codice Fiscale" value={clientForm.values.fiscalCode} onChange={(e) => clientForm.setValue('fiscalCode', e.target.value)} />
          <Input label="PEC" type="email" value={clientForm.values.pec} onChange={(e) => clientForm.setValue('pec', e.target.value)} />
          <Input label="Codice SDI" value={clientForm.values.sdi} onChange={(e) => clientForm.setValue('sdi', e.target.value)} />
          <Input label="Sito Web" value={clientForm.values.website} onChange={(e) => clientForm.setValue('website', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Settore" options={INDUSTRY_OPTIONS} value={clientForm.values.industry} onChange={(e) => clientForm.setValue('industry', e.target.value)} />
          <Select label="Fonte" options={SOURCE_OPTIONS} value={clientForm.values.source} onChange={(e) => clientForm.setValue('source', e.target.value)} />
        </div>
        <Select
          label="Stato"
          value={clientForm.values.status}
          onChange={(e) => clientForm.setValue('status', e.target.value)}
          options={STATUS_OPTIONS.filter((o) => o.value !== '')}
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Note</label>
          <textarea
            rows={3}
            value={clientForm.values.notes}
            onChange={(e) => clientForm.setValue('notes', e.target.value)}
            className="flex w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Annulla
          </Button>
          <Button type="submit" loading={submitting}>Crea Cliente</Button>
        </div>
      </form>
    </Modal>
  )
}
