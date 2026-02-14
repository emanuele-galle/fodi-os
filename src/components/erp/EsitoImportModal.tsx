'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Upload, AlertCircle } from 'lucide-react'

interface EsitoImportModalProps {
  open: boolean
  onClose: () => void
  invoiceId: string
  onImported: () => void
}

export function EsitoImportModal({ open, onClose, invoiceId, onImported }: EsitoImportModalProps) {
  const [xmlContent, setXmlContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ esitoType: string; description: string } | null>(null)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setXmlContent(ev.target?.result as string)
      setError('')
      setResult(null)
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!xmlContent.trim()) {
      setError('Seleziona un file XML o incolla il contenuto')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`/api/erp/invoices/${invoiceId}/fatturapa/import-esito`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ esitoXml: xmlContent }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Errore nell\'importazione')
        return
      }

      const responseData = json.data ?? json
      setResult(responseData.parsedEsito)
      onImported()
    } catch {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setXmlContent('')
    setError('')
    setResult(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Importa Esito SDI" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          Carica il file XML di notifica ricevuto dal Sistema di Interscambio (SDI).
        </p>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium mb-1.5">File XML</label>
          <input
            type="file"
            accept=".xml"
            onChange={handleFileUpload}
            className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
          />
        </div>

        {/* Manual paste */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Oppure incolla l&apos;XML</label>
          <textarea
            value={xmlContent}
            onChange={(e) => { setXmlContent(e.target.value); setError(''); setResult(null) }}
            rows={6}
            className="w-full rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm font-mono resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            placeholder="<?xml version=&quot;1.0&quot; ...>"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="p-3 rounded-md bg-emerald-500/10 text-emerald-600 text-sm">
            <p className="font-medium">Esito importato: {result.esitoType}</p>
            <p className="mt-1">{result.description}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>Annulla</Button>
          <Button onClick={handleImport} loading={loading} disabled={!xmlContent.trim()}>
            <Upload className="h-4 w-4 mr-1.5" />
            Importa Esito
          </Button>
        </div>
      </div>
    </Modal>
  )
}
