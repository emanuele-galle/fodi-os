'use client'

import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Download, Printer, Loader2 } from 'lucide-react'

interface PdfPreviewModalProps {
  open: boolean
  onClose: () => void
  pdfUrl: string
  fileName: string
  title?: string
}

export function PdfPreviewModal({ open, onClose, pdfUrl, fileName, title }: PdfPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!open) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        setBlobUrl(null)
      }
      setError('')
      return
    }

    setLoading(true)
    setError('')

    fetch(pdfUrl, { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'Errore' }))
          throw new Error(data.error || 'Errore nel caricamento del PDF')
        }
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
      })
      .catch((err) => {
        setError(err.message || 'Errore nel caricamento')
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      // Cleanup on unmount
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pdfUrl])

  function handleDownload() {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function handlePrint() {
    if (!iframeRef.current) return
    iframeRef.current.contentWindow?.print()
  }

  return (
    <Modal open={open} onClose={onClose} title={title || 'Anteprima PDF'} size="xl">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleDownload} disabled={!blobUrl}>
            <Download className="h-4 w-4 mr-1.5" />
            Scarica
          </Button>
          <Button size="sm" variant="outline" onClick={handlePrint} disabled={!blobUrl}>
            <Printer className="h-4 w-4 mr-1.5" />
            Stampa
          </Button>
          <span className="text-xs text-muted ml-auto">{fileName}</span>
        </div>

        <div className="rounded-lg border border-border/30 overflow-hidden bg-secondary/30" style={{ height: '70vh' }}>
          {loading && (
            <div className="flex items-center justify-center h-full gap-2 text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Caricamento PDF...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {blobUrl && !loading && (
            <iframe
              ref={iframeRef}
              src={blobUrl}
              className="w-full h-full"
              title="Anteprima PDF"
            />
          )}
        </div>
      </div>
    </Modal>
  )
}
