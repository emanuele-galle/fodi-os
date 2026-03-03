'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface Client {
  id: string
  companyName: string
  email: string | null
  contactName: string | null
}

interface NewSignatureModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  prefill?: {
    documentType?: string
    documentId?: string
    documentTitle?: string
    documentUrl?: string
    signerClientId?: string
    signerName?: string
    signerEmail?: string
  }
}

const DOC_TYPE_OPTIONS = [
  { value: 'QUOTE', label: 'Preventivo' },
  { value: 'CONTRACT', label: 'Contratto' },
  { value: 'CUSTOM', label: 'Altro documento' },
]

export function NewSignatureModal({ open, onClose, onCreated, prefill }: NewSignatureModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<Client[]>([])

  const [documentType, setDocumentType] = useState(prefill?.documentType || 'QUOTE')
  const [documentTitle, setDocumentTitle] = useState(prefill?.documentTitle || '')
  const [documentUrl, setDocumentUrl] = useState(prefill?.documentUrl || '')
  const [signerName, setSignerName] = useState(prefill?.signerName || '')
  const [signerEmail, setSignerEmail] = useState(prefill?.signerEmail || '')
  const [signerPhone, setSignerPhone] = useState('')
  const [signerClientId, setSignerClientId] = useState(prefill?.signerClientId || '')
  const [message, setMessage] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(7)

  useEffect(() => {
    if (open) {
      fetch('/api/clients?limit=200')
        .then((r) => r.json())
        .then((data) => setClients(data.items || []))
        .catch(() => {})
    }
  }, [open])

  // Auto-fill signer info from client selection
  useEffect(() => {
    if (signerClientId) {
      const client = clients.find((c) => c.id === signerClientId)
      if (client) {
        if (!signerName && client.contactName) setSignerName(client.contactName)
        if (!signerEmail && client.email) setSignerEmail(client.email)
      }
    }
  }, [signerClientId, clients, signerName, signerEmail])

  // Apply prefill when it changes
  useEffect(() => {
    if (prefill) {
      if (prefill.documentType) setDocumentType(prefill.documentType)
      if (prefill.documentTitle) setDocumentTitle(prefill.documentTitle)
      if (prefill.documentUrl) setDocumentUrl(prefill.documentUrl)
      if (prefill.signerClientId) setSignerClientId(prefill.signerClientId)
      if (prefill.signerName) setSignerName(prefill.signerName)
      if (prefill.signerEmail) setSignerEmail(prefill.signerEmail)
    }
  }, [prefill])

  const handleDocTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setDocumentType(e.target.value), [])
  const handleDocTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDocumentTitle(e.target.value), [])
  const handleDocUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDocumentUrl(e.target.value), [])
  const handleSignerNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSignerName(e.target.value), [])
  const handleSignerEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSignerEmail(e.target.value), [])
  const handleSignerPhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSignerPhone(e.target.value), [])
  const handleSignerClientChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setSignerClientId(e.target.value), [])
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value), [])
  const handleExpiresChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setExpiresInDays(parseInt(e.target.value)), [])

  const clientOptions = useMemo(() => [
    { value: '', label: 'Seleziona cliente...' },
    ...clients.map((c) => ({ value: c.id, label: c.companyName })),
  ], [clients])

  const expiresOptions = useMemo(() => [
    { value: '3', label: '3 giorni' },
    { value: '7', label: '7 giorni' },
    { value: '14', label: '14 giorni' },
    { value: '30', label: '30 giorni' },
  ], [])

  const handleSubmit = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          documentId: prefill?.documentId,
          documentTitle,
          documentUrl,
          signerName,
          signerEmail,
          signerPhone: signerPhone || undefined,
          signerClientId: signerClientId || undefined,
          message: message || undefined,
          expiresInDays,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Errore nella creazione')
        return
      }

      onCreated()
      onClose()
      // Reset form
      setDocumentType('QUOTE')
      setDocumentTitle('')
      setDocumentUrl('')
      setSignerName('')
      setSignerEmail('')
      setSignerPhone('')
      setSignerClientId('')
      setMessage('')
      setExpiresInDays(7)
    } catch {
      setError('Errore di rete')
    } finally {
      setLoading(false)
    }
  }, [documentType, prefill?.documentId, documentTitle, documentUrl, signerName, signerEmail, signerPhone, signerClientId, message, expiresInDays, onCreated, onClose])

  return (
    <Modal open={open} onClose={onClose} title="Nuova Richiesta Firma" size="lg">
      <div className="space-y-4">
        <Select
          label="Tipo Documento"
          options={DOC_TYPE_OPTIONS}
          value={documentType}
          onChange={handleDocTypeChange}
        />

        <Input
          label="Titolo Documento"
          placeholder="es. Preventivo sito web Rossi Srl"
          value={documentTitle}
          onChange={handleDocTitleChange}
        />

        <Input
          label="URL Documento (PDF)"
          placeholder="https://..."
          value={documentUrl}
          onChange={handleDocUrlChange}
        />

        <div className="border-t border-border/30 pt-4">
          <p className="text-sm font-medium mb-3">Firmatario</p>

          <div className="space-y-3">
            <Select
              label="Cliente (opzionale)"
              options={clientOptions}
              value={signerClientId}
              onChange={handleSignerClientChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Nome Firmatario"
                placeholder="Mario Rossi"
                value={signerName}
                onChange={handleSignerNameChange}
              />
              <Input
                label="Email Firmatario"
                type="email"
                placeholder="mario@example.com"
                value={signerEmail}
                onChange={handleSignerEmailChange}
              />
            </div>

            <Input
              label="Telefono (opzionale)"
              placeholder="+39 333 1234567"
              value={signerPhone}
              onChange={handleSignerPhoneChange}
            />
          </div>
        </div>

        <div className="border-t border-border/30 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Scadenza"
              options={expiresOptions}
              value={String(expiresInDays)}
              onChange={handleExpiresChange}
            />
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-foreground mb-1.5">Messaggio per il firmatario (opzionale)</label>
            <textarea
              className="flex w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 min-h-[80px] resize-y"
              placeholder="Gentile cliente, le chiediamo di firmare..."
              value={message}
              onChange={handleMessageChange}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button
            loading={loading}
            onClick={handleSubmit}
            disabled={!documentTitle || !documentUrl || !signerName || !signerEmail}
          >
            Crea Richiesta Firma
          </Button>
        </div>
      </div>
    </Modal>
  )
}
