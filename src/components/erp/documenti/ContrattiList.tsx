'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ScrollText, FileDown, Send, Search, AlertCircle, Loader2,
  Building2, Briefcase, Wrench, MessageSquare, TrendingUp, Server,
  ExternalLink, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'

interface ContractTemplate {
  id: string
  name: string
  description: string
  category: string
  clauseCount: number
}

interface Client {
  id: string
  companyName: string
  email: string | null
  contactName: string | null
}

interface GeneratedContract {
  contractNumber: string
  templateName: string
  clientName: string
  pdfUrl: string
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tutte le categorie' },
  { value: 'development', label: 'Sviluppo' },
  { value: 'maintenance', label: 'Manutenzione' },
  { value: 'consulting', label: 'Consulenza' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'hosting', label: 'Hosting' },
]

const CATEGORY_LABELS: Record<string, string> = {
  development: 'Sviluppo',
  maintenance: 'Manutenzione',
  consulting: 'Consulenza',
  marketing: 'Marketing',
  hosting: 'Hosting',
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  development: Building2,
  maintenance: Wrench,
  consulting: Briefcase,
  marketing: TrendingUp,
  hosting: Server,
}

const CATEGORY_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'default' | 'info' | 'outline'> = {
  development: 'default',
  maintenance: 'warning',
  consulting: 'info',
  marketing: 'success',
  hosting: 'outline',
}

const CATEGORY_BORDER_COLOR: Record<string, string> = {
  development: 'border-t-primary',
  maintenance: 'border-t-amber-500',
  consulting: 'border-t-blue-500',
  marketing: 'border-t-emerald-500',
  hosting: 'border-t-zinc-400',
}

export function ContrattiList() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Generate modal state
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [city, setCity] = useState('Serra San Bruno')
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')

  // Result state
  const [generatedContract, setGeneratedContract] = useState<GeneratedContract | null>(null)

  // Send for signing modal
  const [sendModal, setSendModal] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendSuccess, setSendSuccess] = useState(false)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)
      const res = await fetch(`/api/contracts/templates?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.items || [])
      } else {
        setFetchError('Errore nel caricamento dei template contratto')
      }
    } catch {
      setFetchError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  // Fetch clients when generate modal opens
  useEffect(() => {
    if (selectedTemplate) {
      fetch('/api/clients?limit=200')
        .then((r) => r.json())
        .then((data) => setClients(data.items || []))
        .catch(() => {})
    }
  }, [selectedTemplate])

  // Auto-fill signer info from selected client
  useEffect(() => {
    if (selectedClientId && generatedContract) {
      const client = clients.find((c) => c.id === selectedClientId)
      if (client) {
        if (client.contactName) setSignerName(client.contactName)
        if (client.email) setSignerEmail(client.email)
      }
    }
  }, [selectedClientId, clients, generatedContract])

  const filteredTemplates = search
    ? templates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
      )
    : templates

  async function handleGenerate() {
    if (!selectedTemplate || !selectedClientId) return
    setGenerating(true)
    setGenerateError('')
    try {
      const res = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          clientId: selectedClientId,
          city,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setGeneratedContract(data)
        // Pre-fill signer from client
        const client = clients.find((c) => c.id === selectedClientId)
        if (client) {
          if (client.contactName) setSignerName(client.contactName)
          if (client.email) setSignerEmail(client.email)
        }
      } else {
        const data = await res.json()
        setGenerateError(data.error || 'Errore nella generazione')
      }
    } catch {
      setGenerateError('Errore di rete')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSendForSigning() {
    if (!generatedContract || !signerName || !signerEmail) return
    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'CONTRACT',
          documentTitle: `${generatedContract.templateName} - ${generatedContract.clientName}`,
          documentUrl: generatedContract.pdfUrl,
          signerName,
          signerEmail,
          signerClientId: selectedClientId || undefined,
          expiresInDays: 14,
        }),
      })
      if (res.ok) {
        setSendSuccess(true)
      } else {
        const data = await res.json()
        setSendError(data.error || 'Errore nell\'invio')
      }
    } catch {
      setSendError('Errore di rete')
    } finally {
      setSending(false)
    }
  }

  function resetModal() {
    setSelectedTemplate(null)
    setSelectedClientId('')
    setCity('Serra San Bruno')
    setGenerating(false)
    setGenerateError('')
    setGeneratedContract(null)
    setSendModal(false)
    setSignerName('')
    setSignerEmail('')
    setSending(false)
    setSendError('')
    setSendSuccess(false)
  }

  const clientOptions = [
    { value: '', label: 'Seleziona cliente...' },
    ...clients.map((c) => ({ value: c.id, label: c.companyName })),
  ]

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            placeholder="Cerca template contratto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          options={CATEGORY_OPTIONS}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {/* Error */}
      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
          <button onClick={() => fetchTemplates()} className="text-sm font-medium text-destructive hover:underline flex-shrink-0">Riprova</button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-lg" />)}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ScrollText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-bold text-lg mb-1">Nessun template trovato</h3>
          <p className="text-sm text-muted max-w-xs">
            {search || categoryFilter ? 'Prova a modificare i filtri di ricerca.' : 'I template contratto non sono stati caricati.'}
          </p>
        </div>
      ) : (
        /* Template Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((t) => {
            const CategoryIcon = CATEGORY_ICONS[t.category] || ScrollText
            return (
              <div
                key={t.id}
                className={`rounded-lg border border-border border-t-2 ${CATEGORY_BORDER_COLOR[t.category] || 'border-t-zinc-300 dark:border-t-zinc-600'} bg-card hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col`}
              >
                {/* Card Header */}
                <div className="p-4 pb-0">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <CategoryIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm leading-tight mb-1">{t.name}</h3>
                      <Badge variant={CATEGORY_BADGE_VARIANT[t.category] || 'outline'}>
                        {CATEGORY_LABELS[t.category] || t.category}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted line-clamp-3 mb-3">{t.description}</p>
                </div>

                {/* Card Footer */}
                <div className="mt-auto p-4 pt-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-muted">{t.clauseCount} clausole</span>
                  <Button
                    size="sm"
                    onClick={() => setSelectedTemplate(t)}
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1" />
                    Genera
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ GENERATE CONTRACT MODAL ═══════════════════════════ */}
      <Modal
        open={!!selectedTemplate && !generatedContract}
        onClose={resetModal}
        title={`Genera Contratto`}
        size="lg"
      >
        {selectedTemplate && (
          <div className="space-y-4">
            {/* Selected template info */}
            <div className="rounded-lg border border-border bg-secondary/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <ScrollText className="h-4 w-4 text-primary" />
                <span className="font-bold text-sm">{selectedTemplate.name}</span>
              </div>
              <p className="text-xs text-muted">{selectedTemplate.description}</p>
              <p className="text-xs text-muted mt-1">{selectedTemplate.clauseCount} clausole legali</p>
            </div>

            <Select
              label="Cliente *"
              options={clientOptions}
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            />

            <Input
              label="Luogo di stipula"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="es. Milano"
            />

            {generateError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {generateError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={resetModal}>Annulla</Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedClientId || generating}
                loading={generating}
              >
                <FileDown className="h-4 w-4 mr-1" />
                Genera PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ CONTRACT GENERATED - RESULT MODAL ════════════════ */}
      <Modal
        open={!!generatedContract && !sendModal}
        onClose={resetModal}
        title="Contratto Generato"
        size="md"
      >
        {generatedContract && (
          <div className="space-y-4">
            {/* Success banner */}
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm text-emerald-900 dark:text-emerald-100">PDF generato con successo</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  {generatedContract.contractNumber} - {generatedContract.templateName}
                </p>
              </div>
            </div>

            {/* Contract details */}
            <div className="rounded-lg border border-border bg-secondary/5 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Numero</span>
                <span className="font-mono font-medium">{generatedContract.contractNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Template</span>
                <span className="font-medium">{generatedContract.templateName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Cliente</span>
                <span className="font-medium">{generatedContract.clientName}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(generatedContract.pdfUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Visualizza PDF
              </Button>
              <Button
                className="flex-1"
                onClick={() => setSendModal(true)}
              >
                <Send className="h-4 w-4 mr-1" />
                Invia per Firma
              </Button>
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={resetModal}>Chiudi</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ SEND FOR SIGNING MODAL ═══════════════════════════ */}
      <Modal
        open={sendModal}
        onClose={() => {
          if (sendSuccess) { resetModal() } else { setSendModal(false) }
        }}
        title={sendSuccess ? 'Richiesta Inviata' : 'Invia per Firma Digitale'}
        size="md"
      >
        {sendSuccess ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Check className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm text-emerald-900 dark:text-emerald-100">Richiesta di firma inviata</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Il cliente ricevera un&apos;email con il link per firmare il contratto.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted">
              Puoi monitorare lo stato della firma dalla tab <strong>Firme</strong>.
            </p>
            <div className="flex justify-end">
              <Button onClick={resetModal}>Chiudi</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {generatedContract && (
              <div className="rounded-lg border border-border bg-secondary/5 p-3">
                <p className="text-sm font-medium">{generatedContract.templateName}</p>
                <p className="text-xs text-muted">{generatedContract.contractNumber} - {generatedContract.clientName}</p>
              </div>
            )}

            <Input
              label="Nome Firmatario *"
              placeholder="Mario Rossi"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />

            <Input
              label="Email Firmatario *"
              type="email"
              placeholder="mario@example.com"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
            />

            {sendError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {sendError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setSendModal(false)}>Indietro</Button>
              <Button
                onClick={handleSendForSigning}
                disabled={!signerName || !signerEmail || sending}
                loading={sending}
              >
                <Send className="h-4 w-4 mr-1" />
                Invia Richiesta Firma
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
