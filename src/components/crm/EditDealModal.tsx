'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { AlertCircle, Trash2, FileText, Loader2 } from 'lucide-react'
import { DealAiSummary } from '@/components/crm/DealAiSummary'

interface Deal {
  id: string
  title: string
  description: string | null
  value: string
  stage: string
  probability: number
  expectedCloseDate: string | null
  actualCloseDate: string | null
  lostReason: string | null
  clientId: string | null
  leadId: string | null
  client: { id: string; companyName: string } | null
  lead: { id: string; name: string; company: string | null } | null
  contact: { id: string; firstName: string; lastName: string } | null
  owner: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
}

interface EditDealModalProps {
  deal: Deal
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Client {
  id: string
  companyName: string
}

interface Contact {
  id: string
  firstName: string
  lastName: string
}

const DEAL_STAGES = [
  { value: 'QUALIFICATION', label: 'Qualificazione' },
  { value: 'PROPOSAL', label: 'Proposta' },
  { value: 'NEGOTIATION', label: 'Negoziazione' },
  { value: 'CLOSED_WON', label: 'Chiusa - Vinta' },
  { value: 'CLOSED_LOST', label: 'Chiusa - Persa' },
]

export function EditDealModal({ deal, open, onOpenChange, onSuccess }: EditDealModalProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [generatingQuote, setGeneratingQuote] = useState(false)
  const [quoteResult, setQuoteResult] = useState<{ number: string; id: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { confirm, confirmProps } = useConfirm()
  const [clients, setClients] = useState<Client[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)

  const [formData, setFormData] = useState({
    title: deal.title,
    description: deal.description || '',
    value: deal.value,
    stage: deal.stage,
    probability: String(deal.probability),
    expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.split('T')[0] : '',
    lostReason: deal.lostReason || '',
    clientId: deal.clientId || '',
    contactId: deal.contact?.id || '',
  })

  const isDirty = formData.title !== deal.title ||
    formData.description !== (deal.description || '') ||
    formData.value !== deal.value ||
    formData.stage !== deal.stage ||
    formData.probability !== String(deal.probability) ||
    formData.clientId !== (deal.clientId || '')

  // Load clients
  useEffect(() => {
    if (open) {
      fetch('/api/clients?limit=500')
        .then((res) => res.json())
        .then((data) => setClients(data.items || []))
        .catch(() => setError('Errore nel caricamento dei clienti'))
    }
  }, [open])

  // Load contacts when client is selected
  useEffect(() => {
    if (formData.clientId) {
      setLoadingContacts(true)

      fetch(`/api/clients/${formData.clientId}/contacts`)
        .then((res) => res.json())
        .then((data) => {
          setContacts(data.items || [])
          setLoadingContacts(false)
        })
        .catch(() => {
          setLoadingContacts(false)
        })
    } else {
      setContacts([])
    }
  }, [formData.clientId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('Il titolo è obbligatorio')
      return
    }

    if (!formData.value || parseFloat(formData.value) <= 0) {
      setError('Il valore deve essere maggiore di 0')
      return
    }

    if (formData.stage === 'CLOSED_LOST' && !formData.lostReason.trim()) {
      setError('Specifica il motivo della perdita')
      return
    }

    setLoading(true)

    try {
      const body: {
        title: string
        description: string | null
        value: number
        stage: string
        probability: number
        expectedCloseDate: string | null
        clientId: string | null
        contactId: string | null
        lostReason: string | null
      } = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        value: parseFloat(formData.value),
        stage: formData.stage,
        probability: parseInt(formData.probability),
        expectedCloseDate: formData.expectedCloseDate || null,
        clientId: formData.clientId || null,
        contactId: formData.contactId || null,
        lostReason: formData.stage === 'CLOSED_LOST' ? formData.lostReason.trim() : null,
      }

      const res = await fetch(`/api/deals/${deal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        onSuccess()
        onOpenChange(false)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Errore nell\'aggiornamento dell\'opportunità')
      }
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateQuote() {
    setGeneratingQuote(true)
    setError(null)
    setQuoteResult(null)
    try {
      const res = await fetch(`/api/deals/${deal.id}/generate-quote`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setQuoteResult({ number: data.data.number, id: data.data.id })
      } else {
        setError(data.error || 'Errore nella generazione del preventivo')
      }
    } catch {
      setError('Errore di rete')
    } finally {
      setGeneratingQuote(false)
    }
  }

  async function handleDelete() {
    const ok = await confirm({ message: 'Sei sicuro di voler eliminare questa opportunità?', variant: 'danger' })
    if (!ok) return

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        onSuccess()
        onOpenChange(false)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Errore nell\'eliminazione dell\'opportunità')
      }
    } catch {
      setError('Errore di rete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- close handler
    <Modal open={open} onClose={() => onOpenChange(false)} title="Modifica Opportunità" size="xl" preventAccidentalClose={isDirty}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <DealAiSummary dealId={deal.id} />
          {deal.clientId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateQuote}
              disabled={generatingQuote}
              className="gap-1.5 text-xs"
            >
              {generatingQuote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {generatingQuote ? 'Generazione...' : 'Genera Preventivo AI'}
            </Button>
          )}
        </div>

        {quoteResult && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 text-sm">
            Preventivo <strong>{quoteResult.number}</strong> creato come bozza.{' '}
            <a href={`/erp/quotes?quoteId=${quoteResult.id}`} className="text-primary underline">
              Visualizza
            </a>
          </div>
        )}

        {/* eslint-disable react-perf/jsx-no-new-function-as-prop -- form handlers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5">
                  Titolo <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Es. Nuovo sito web aziendale"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5">Descrizione</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Dettagli dell'opportunità..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Valore (€) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="5000.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Probabilità (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData((prev) => ({ ...prev, probability: e.target.value }))}
                  placeholder="50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Fase</label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stage: e.target.value }))}
                  className="flex h-11 md:h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
                >
                  {DEAL_STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Data Chiusura Prevista</label>
                <Input
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, expectedCloseDate: e.target.value }))}
                />
              </div>

              {formData.stage === 'CLOSED_LOST' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">
                    Motivo Perdita <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    value={formData.lostReason}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lostReason: e.target.value }))}
                    placeholder="Perché abbiamo perso questa opportunità?"
                    rows={2}
                    required
                  />
                </div>
              )}

              <div>
                <SearchableSelect
                  label="Cliente"
                  required
                  options={clients.map((c) => ({ value: c.id, label: c.companyName }))}
                  value={formData.clientId}
                  onChange={(val) => setFormData((prev) => ({ ...prev, clientId: val }))}
                  placeholder="Cerca cliente..."
                />
              </div>

              <div>
                <SearchableSelect
                  label="Contatto"
                  options={contacts.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))}
                  value={formData.contactId}
                  onChange={(val) => setFormData((prev) => ({ ...prev, contactId: val }))}
                  placeholder={loadingContacts ? 'Caricamento...' : 'Seleziona contatto'}
                  disabled={!formData.clientId || loadingContacts}
                />
              </div>
            </div>
        {/* eslint-enable react-perf/jsx-no-new-function-as-prop */}

        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || deleting}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {deleting ? 'Eliminazione...' : 'Elimina'}
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop -- close handler
              onClick={() => onOpenChange(false)}
              disabled={loading || deleting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading || deleting}>
              {loading ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        </div>
      </form>
      <ConfirmDialog {...confirmProps} />
    </Modal>
  )
}
