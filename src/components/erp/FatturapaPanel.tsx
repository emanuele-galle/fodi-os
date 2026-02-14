'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { FatturapaStatusBadge } from './FatturapaStatusBadge'
import { FatturapaTimeline } from './FatturapaTimeline'
import { EsitoImportModal } from './EsitoImportModal'
import { CreditNoteModal } from './CreditNoteModal'
import { XmlPreviewModal } from './XmlPreviewModal'
import { EINVOICE_STATUS_CONFIG, TIPO_DOCUMENTO_LABELS, ESITO_TYPE_LABELS, VALID_STATUS_TRANSITIONS } from '@/lib/fatturapa'
import { PdfPreviewModal } from './PdfPreviewModal'
import {
  FileText, Download, Upload, Send, Eye, RotateCw,
  FileDown, FileMinus2, Loader2, AlertCircle, ChevronDown, FileSearch,
} from 'lucide-react'

interface EInvoiceData {
  id: string
  status: string
  tipoDocumento: string
  xmlContent: string | null
  xmlFileName: string | null
  sdiIdentificativo: string | null
  esitoType: string | null
  esitoDescription: string | null
  originalInvoiceRef: string | null
  generatedAt: string | null
  exportedAt: string | null
  uploadedAt: string | null
  createdAt: string
}

interface StatusLog {
  id: string
  fromStatus: string
  toStatus: string
  note: string | null
  performedBy: string | null
  createdAt: string
}

interface FatturapaPanelProps {
  invoiceId: string
  invoiceNumber: string
}

export function FatturapaPanel({ invoiceId, invoiceNumber }: FatturapaPanelProps) {
  const [eInvoice, setEInvoice] = useState<EInvoiceData | null>(null)
  const [logs, setLogs] = useState<StatusLog[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const [showXmlPreview, setShowXmlPreview] = useState(false)
  const [showEsitoImport, setShowEsitoImport] = useState(false)
  const [showCreditNote, setShowCreditNote] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showPdfPreview, setShowPdfPreview] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [eiRes, histRes] = await Promise.all([
        fetch(`/api/erp/invoices/${invoiceId}/fatturapa`),
        fetch(`/api/erp/invoices/${invoiceId}/fatturapa/history`),
      ])

      if (eiRes.ok) {
        const data = await eiRes.json()
        setEInvoice(data)
      }
      if (histRes.ok) {
        setLogs(await histRes.json())
      }
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch(`/api/erp/invoices/${invoiceId}/fatturapa`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setEInvoice(data)
        fetchData()
      } else {
        setError(data.error || 'Errore nella generazione')
      }
    } catch {
      setError('Errore di connessione')
    } finally {
      setGenerating(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    setError('')
    try {
      const res = await fetch(`/api/erp/invoices/${invoiceId}/fatturapa/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        setEInvoice(data)
        fetchData()
      } else {
        setError(data.error || 'Errore nell\'esportazione')
      }
    } catch {
      setError('Errore di connessione')
    } finally {
      setExporting(false)
    }
  }

  function handleDownloadXml() {
    if (!eInvoice?.xmlContent) return
    const blob = new Blob([eInvoice.xmlContent], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = eInvoice.xmlFileName || `${invoiceNumber.replace(/\//g, '-')}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleStatusUpdate(newStatus: string) {
    setUpdatingStatus(true)
    setShowStatusMenu(false)
    setError('')
    try {
      const res = await fetch(`/api/erp/invoices/${invoiceId}/fatturapa/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setEInvoice(data)
        fetchData()
      } else {
        setError(data.error || 'Errore nell\'aggiornamento stato')
      }
    } catch {
      setError('Errore di connessione')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 bg-secondary/60 rounded" />
            <div className="h-10 w-full bg-secondary/40 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentStatus = eInvoice?.status?.toUpperCase() || ''
  const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || []

  const overviewContent = (
    <div className="space-y-4">
      {/* Status + meta */}
      {eInvoice && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <FatturapaStatusBadge status={eInvoice.status} />
            {eInvoice.tipoDocumento && (
              <span className="text-xs text-muted bg-secondary/60 px-2 py-0.5 rounded">
                {TIPO_DOCUMENTO_LABELS[eInvoice.tipoDocumento] || eInvoice.tipoDocumento}
              </span>
            )}
            {eInvoice.xmlFileName && (
              <span className="text-xs text-muted">{eInvoice.xmlFileName}</span>
            )}
            {eInvoice.sdiIdentificativo && (
              <span className="text-xs text-muted">SDI: {eInvoice.sdiIdentificativo}</span>
            )}
          </div>

          {/* Esito info */}
          {eInvoice.esitoType && (
            <div className={`p-3 rounded-md text-sm border ${
              eInvoice.esitoType === 'RC' || eInvoice.esitoType === 'AT'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                : eInvoice.esitoType === 'NS' || eInvoice.esitoType === 'NE'
                ? 'bg-destructive/10 border-destructive/20 text-destructive'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
            }`}>
              <p className="font-medium">{ESITO_TYPE_LABELS[eInvoice.esitoType] || eInvoice.esitoType}</p>
              {eInvoice.esitoDescription && <p className="mt-1">{eInvoice.esitoDescription}</p>}
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted">
            {eInvoice.generatedAt && <div>Generato: {new Date(eInvoice.generatedAt).toLocaleString('it-IT')}</div>}
            {eInvoice.exportedAt && <div>Esportato: {new Date(eInvoice.exportedAt).toLocaleString('it-IT')}</div>}
            {eInvoice.uploadedAt && <div>Caricato SDI: {new Date(eInvoice.uploadedAt).toLocaleString('it-IT')}</div>}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {!eInvoice && (
          <Button size="sm" onClick={handleGenerate} loading={generating}>
            <FileText className="h-4 w-4 mr-1.5" />
            Genera XML FatturaPA
          </Button>
        )}

        {eInvoice && (
          <>
            <Button size="sm" variant="outline" onClick={handleGenerate} loading={generating}>
              <RotateCw className="h-4 w-4 mr-1.5" />
              Rigenera
            </Button>

            {eInvoice.xmlContent && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowXmlPreview(true)}>
                  <Eye className="h-4 w-4 mr-1.5" />
                  Anteprima
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadXml}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Scarica XML
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPdfPreview(true)}>
                  <FileSearch className="h-4 w-4 mr-1.5" />
                  PDF Fattura
                </Button>
              </>
            )}

            {(currentStatus === 'GENERATED' || currentStatus === 'generated') && (
              <Button size="sm" onClick={handleExport} loading={exporting}>
                <FileDown className="h-4 w-4 mr-1.5" />
                Esporta
              </Button>
            )}

            {(currentStatus === 'EXPORTED' || currentStatus === 'UPLOADED_TO_SDI' || currentStatus === 'DELIVERED') && (
              <Button size="sm" variant="outline" onClick={() => setShowEsitoImport(true)}>
                <Upload className="h-4 w-4 mr-1.5" />
                Importa Esito
              </Button>
            )}

            {/* Manual status update */}
            {validTransitions.length > 0 && (
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  loading={updatingStatus}
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Aggiorna Stato
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
                {showStatusMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-card border border-border/40 rounded-lg shadow-lg z-10 min-w-[180px]">
                    {validTransitions.map((status) => {
                      const config = EINVOICE_STATUS_CONFIG[status]
                      return (
                        <button
                          key={status}
                          onClick={() => handleStatusUpdate(status)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 transition-colors first:rounded-t-lg last:rounded-b-lg"
                        >
                          {config?.label || status}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <Button size="sm" variant="outline" onClick={() => setShowCreditNote(true)}>
              <FileMinus2 className="h-4 w-4 mr-1.5" />
              Nota di Credito
            </Button>
          </>
        )}
      </div>
    </div>
  )

  const timelineContent = <FatturapaTimeline logs={logs} />

  return (
    <>
      <Card>
        <CardContent>
          <CardTitle className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Fatturazione Elettronica
          </CardTitle>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm border border-destructive/20">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {eInvoice ? (
            <Tabs
              tabs={[
                { id: 'overview', label: 'Panoramica', content: overviewContent },
                { id: 'timeline', label: 'Storico', content: timelineContent },
              ]}
            />
          ) : (
            overviewContent
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {eInvoice?.xmlContent && (
        <XmlPreviewModal
          open={showXmlPreview}
          onClose={() => setShowXmlPreview(false)}
          xmlContent={eInvoice.xmlContent}
          fileName={eInvoice.xmlFileName || undefined}
        />
      )}

      <EsitoImportModal
        open={showEsitoImport}
        onClose={() => setShowEsitoImport(false)}
        invoiceId={invoiceId}
        onImported={fetchData}
      />

      <CreditNoteModal
        open={showCreditNote}
        onClose={() => setShowCreditNote(false)}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        onCreated={fetchData}
      />

      <PdfPreviewModal
        open={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        pdfUrl={`/api/invoices/${invoiceId}/pdf`}
        fileName={`${invoiceNumber.replace(/\//g, '-')}.pdf`}
        title={`PDF Fattura - ${invoiceNumber}`}
      />
    </>
  )
}
