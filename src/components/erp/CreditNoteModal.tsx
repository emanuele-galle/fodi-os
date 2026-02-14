'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { FileText, AlertCircle } from 'lucide-react'

interface CreditNoteModalProps {
  open: boolean
  onClose: () => void
  invoiceId: string
  invoiceNumber: string
  onCreated: () => void
}

export function CreditNoteModal({ open, onClose, invoiceId, invoiceNumber, onCreated }: CreditNoteModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!reason.trim()) {
      setError('Inserisci il motivo della nota di credito')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/erp/invoices/${invoiceId}/credit-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Errore nella creazione')
        return
      }

      onCreated()
      handleClose()
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setReason('')
    setError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Crea Nota di Credito" size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Crea una nota di credito (TD04) collegata alla fattura <strong>{invoiceNumber}</strong>.
          Verranno utilizzate le stesse voci della fattura originale.
        </p>

        <Input
          label="Motivo"
          value={reason}
          onChange={(e) => { setReason(e.target.value); setError('') }}
          placeholder="es. Storno parziale, reso merce, errore in fattura..."
        />

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>Annulla</Button>
          <Button onClick={handleCreate} loading={loading} disabled={!reason.trim()}>
            <FileText className="h-4 w-4 mr-1.5" />
            Crea Nota di Credito
          </Button>
        </div>
      </div>
    </Modal>
  )
}
