'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, CheckCircle2, Edit, FileText, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: string
  total: string
  sortOrder: number
}

interface InvoiceDetail {
  id: string
  number: string
  title: string
  status: string
  subtotal: string
  taxRate: string
  taxAmount: string
  total: string
  discount: string
  issuedDate: string | null
  dueDate: string | null
  paidDate: string | null
  paidAmount: string | null
  paymentMethod: string | null
  notes: string | null
  createdAt: string
  client: { id: string; companyName: string; pec: string | null; vatNumber: string | null }
  lineItems: LineItem[]
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  DRAFT: 'default', SENT: 'default', PAID: 'success', PARTIALLY_PAID: 'warning', OVERDUE: 'destructive', CANCELLED: 'outline',
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza', SENT: 'Inviata', PAID: 'Pagata', PARTIALLY_PAID: 'Parziale', OVERDUE: 'Scaduta', CANCELLED: 'Annullata',
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const invoiceId = params.invoiceId as string

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [eInvoice, setEInvoice] = useState<{ id: string; status: string; xmlContent: string | null; createdAt: string } | null>(null)
  const [generatingXml, setGeneratingXml] = useState(false)
  const [xmlError, setXmlError] = useState('')
  const [showXmlPreview, setShowXmlPreview] = useState(false)

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`)
      if (res.ok) setInvoice(await res.json())
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  const fetchEInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/erp/invoices/${invoiceId}/fatturapa`)
      if (res.ok) {
        const data = await res.json()
        setEInvoice(data)
      }
    } catch {
      // ignore
    }
  }, [invoiceId])

  useEffect(() => { fetchInvoice(); fetchEInvoice() }, [fetchInvoice, fetchEInvoice])

  async function handleGenerateXml() {
    setGeneratingXml(true)
    setXmlError('')
    try {
      const res = await fetch(`/api/erp/invoices/${invoiceId}/fatturapa`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setEInvoice(data)
        setShowXmlPreview(true)
      } else {
        setXmlError(data.error || 'Errore nella generazione')
      }
    } catch {
      setXmlError('Errore di connessione')
    } finally {
      setGeneratingXml(false)
    }
  }

  function handleDownloadXml() {
    if (!eInvoice?.xmlContent || !invoice) return
    const blob = new Blob([eInvoice.xmlContent], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${invoice.number.replace(/\//g, '-')}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleMarkAsPaid() {
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAID', paidDate: new Date().toISOString(), paidAmount: invoice?.total }),
    })
    if (res.ok) fetchInvoice()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Fattura non trovata.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/erp/invoices')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
      </div>
    )
  }

  const discountNum = parseFloat(invoice.discount) || 0

  return (
    <div>
      <button
        onClick={() => router.push('/erp/invoices')}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Torna alle fatture
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{invoice.number}</h1>
            <Badge variant={STATUS_BADGE[invoice.status] || 'default'}>
              {STATUS_LABELS[invoice.status] || invoice.status}
            </Badge>
          </div>
          <p className="text-muted mt-1">{invoice.title}</p>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
            <Button size="sm" onClick={handleMarkAsPaid}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Segna come Pagata
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardContent>
          <CardTitle className="mb-3">Dati Cliente</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted">Ragione Sociale:</span>
              <span className="ml-2 font-medium">{invoice.client.companyName}</span>
            </div>
            {invoice.client.vatNumber && (
              <div>
                <span className="text-muted">P.IVA:</span>
                <span className="ml-2">{invoice.client.vatNumber}</span>
              </div>
            )}
            {invoice.client.pec && (
              <div>
                <span className="text-muted">PEC:</span>
                <span className="ml-2">{invoice.client.pec}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent>
          <CardTitle className="mb-3">Voci</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted bg-secondary/30">
                  <th className="py-3 pr-4 pl-3 font-medium">Descrizione</th>
                  <th className="py-3 pr-4 font-medium text-right">Quantita</th>
                  <th className="py-3 pr-4 font-medium text-right">Prezzo Unitario</th>
                  <th className="py-3 font-medium text-right">Totale</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item) => (
                    <tr key={item.id} className="border-b border-border/50 even:bg-secondary/20">
                      <td className="py-3 pr-4">{item.description}</td>
                      <td className="py-3 pr-4 text-right">{item.quantity}</td>
                      <td className="py-3 pr-4 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm max-w-xs ml-auto">
            <div className="flex justify-between">
              <span className="text-muted">Subtotale</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {discountNum > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Sconto</span>
                <span className="text-destructive">-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted">IVA ({invoice.taxRate}%)</span>
              <span>{formatCurrency(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border text-base font-bold">
              <span>Totale</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {(invoice.paidDate || invoice.paymentMethod) && (
        <Card className="mb-6">
          <CardContent>
            <CardTitle className="mb-3">Informazioni Pagamento</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              {invoice.paidDate && (
                <div>
                  <span className="text-muted">Data Pagamento:</span>
                  <span className="ml-2">{new Date(invoice.paidDate).toLocaleDateString('it-IT')}</span>
                </div>
              )}
              {invoice.paidAmount && (
                <div>
                  <span className="text-muted">Importo Pagato:</span>
                  <span className="ml-2 font-medium">{formatCurrency(invoice.paidAmount)}</span>
                </div>
              )}
              {invoice.paymentMethod && (
                <div>
                  <span className="text-muted">Metodo:</span>
                  <span className="ml-2">{invoice.paymentMethod}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {invoice.notes && (
        <Card className="mb-6">
          <CardContent>
            <CardTitle className="mb-2">Note</CardTitle>
            <p className="text-sm text-muted whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Fatturazione Elettronica */}
      <Card>
        <CardContent>
          <CardTitle className="mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Fatturazione Elettronica
          </CardTitle>

          {xmlError && (
            <div className="mb-3 p-3 rounded-md text-sm bg-destructive/10 text-destructive border border-destructive/20">
              {xmlError}
            </div>
          )}

          {eInvoice ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant={eInvoice.status === 'generated' ? 'default' : 'outline'}>
                  {eInvoice.status === 'draft' ? 'Bozza' : eInvoice.status === 'generated' ? 'XML Generato' : eInvoice.status}
                </Badge>
                <span className="text-xs text-muted">
                  Generato il {new Date(eInvoice.createdAt).toLocaleString('it-IT')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleGenerateXml} disabled={generatingXml}>
                  {generatingXml ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
                  Rigenera XML
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadXml}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Scarica XML
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowXmlPreview(!showXmlPreview)}>
                  {showXmlPreview ? 'Nascondi Preview' : 'Mostra Preview'}
                </Button>
              </div>

              {showXmlPreview && eInvoice.xmlContent && (
                <div className="mt-3 p-4 bg-secondary/50 rounded-md overflow-x-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">{eInvoice.xmlContent}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Genera il file XML FatturaPA per questa fattura.
              </p>
              <Button size="sm" onClick={handleGenerateXml} disabled={generatingXml}>
                {generatingXml ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
                {generatingXml ? 'Generazione...' : 'Genera XML FatturaPA'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
