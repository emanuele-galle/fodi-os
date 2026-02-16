'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { AlertCircle } from 'lucide-react'

interface CreateDealModalProps {
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

const INITIAL_FORM = {
  title: '',
  description: '',
  value: '',
  stage: 'QUALIFICATION',
  probability: '50',
  expectedCloseDate: '',
  clientId: '',
  contactId: '',
}

export function CreateDealModal({ open, onOpenChange, onSuccess }: CreateDealModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)

  const [formData, setFormData] = useState(INITIAL_FORM)

  const isDirty = formData.title !== '' || formData.description !== '' || formData.value !== '' || formData.clientId !== ''

  // Load clients
  useEffect(() => {
    if (open) {
      fetch('/api/clients?limit=100')
        .then((res) => res.json())
        .then((data) => setClients(data.items || []))
        .catch(() => setError('Errore nel caricamento dei clienti'))
    }
  }, [open])

  // Load contacts when client is selected
  useEffect(() => {
    if (formData.clientId) {
      setLoadingContacts(true)
      setContacts([])
      setFormData((prev) => ({ ...prev, contactId: '' }))

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

    if (!formData.clientId) {
      setError('Seleziona un cliente')
      return
    }

    if (!formData.value || parseFloat(formData.value) <= 0) {
      setError('Il valore deve essere maggiore di 0')
      return
    }

    setLoading(true)

    try {
      const body: any = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        value: parseFloat(formData.value),
        stage: formData.stage,
        probability: parseInt(formData.probability),
        expectedCloseDate: formData.expectedCloseDate || null,
        clientId: formData.clientId,
        contactId: formData.contactId || null,
      }

      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        onSuccess()
        onOpenChange(false)
        // Reset form
        setFormData(INITIAL_FORM)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Errore nella creazione dell\'opportunità')
      }
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} title="Nuova Opportunità" size="xl" preventAccidentalClose={isDirty}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

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

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Cliente <span className="text-destructive">*</span>
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, clientId: e.target.value }))}
                  required
                  className="flex h-11 md:h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
                >
                  <option value="">Seleziona cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Contatto</label>
                <select
                  value={formData.contactId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contactId: e.target.value }))}
                  disabled={!formData.clientId || loadingContacts}
                  className="flex h-11 md:h-10 w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingContacts ? 'Caricamento...' : 'Seleziona contatto'}
                  </option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creazione...' : 'Crea Opportunità'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
