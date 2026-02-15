'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Send, ArrowRight, Eye, Pencil, X, Save, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { QuotePdfButton } from '@/components/erp/QuotePdfButton'
import { PdfPreviewModal } from '@/components/erp/PdfPreviewModal'
import { formatCurrency } from '@/lib/utils'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: string
  total: string
  sortOrder: number
}

interface EditLineItem {
  description: string
  quantity: number
  unitPrice: number
}

interface QuoteDetail {
  id: string
  number: string
  title: string
  status: string
  subtotal: string
  taxRate: string
  taxAmount: string
  total: string
  discount: string
  validUntil: string | null
  notes: string | null
  createdAt: string
  client: { id: string; companyName: string; pec: string | null; vatNumber: string | null }
  lineItems: LineItem[]
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bozza', SENT: 'Inviato', APPROVED: 'Approvato', REJECTED: 'Rifiutato', EXPIRED: 'Scaduto', INVOICED: 'Fatturato',
}

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const quoteId = params.quoteId as string

  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [confirmConvertOpen, setConfirmConvertOpen] = useState(false)
  const [converting, setConverting] = useState(false)
  const [sending, setSending] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Edit mode state
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editTaxRate, setEditTaxRate] = useState(22)
  const [editDiscount, setEditDiscount] = useState(0)
  const [editValidUntil, setEditValidUntil] = useState('')
  const [editLineItems, setEditLineItems] = useState<EditLineItem[]>([])
  const [editError, setEditError] = useState('')

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`)
      if (res.ok) {
        const json = await res.json()
        setQuote(json.data || json)
      }
    } finally {
      setLoading(false)
    }
  }, [quoteId])

  useEffect(() => { fetchQuote() }, [fetchQuote])

  function startEditing() {
    if (!quote) return
    setEditTitle(quote.title)
    setEditNotes(quote.notes || '')
    setEditTaxRate(parseFloat(quote.taxRate) || 22)
    setEditDiscount(parseFloat(quote.discount) || 0)
    setEditValidUntil(quote.validUntil ? quote.validUntil.split('T')[0] : '')
    setEditLineItems(
      quote.lineItems
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice),
        }))
    )
    setEditError('')
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setEditError('')
  }

  function addLineItem() {
    setEditLineItems([...editLineItems, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeLineItem(index: number) {
    if (editLineItems.length <= 1) return
    setEditLineItems(editLineItems.filter((_, i) => i !== index))
  }

  function updateLineItem(index: number, field: keyof EditLineItem, value: string | number) {
    const updated = [...editLineItems]
    if (field === 'description') {
      updated[index].description = value as string
    } else {
      updated[index][field] = Number(value) || 0
    }
    setEditLineItems(updated)
  }

  // Calculate totals for edit preview
  const editSubtotal = editLineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const editTaxable = editSubtotal - editDiscount
  const editTaxAmount = editTaxable * (editTaxRate / 100)
  const editTotal = editTaxable + editTaxAmount

  async function handleSave() {
    if (!editTitle.trim()) {
      setEditError('Il titolo è obbligatorio')
      return
    }
    if (editLineItems.some((item) => !item.description.trim())) {
      setEditError('Tutte le voci devono avere una descrizione')
      return
    }
    if (editLineItems.length === 0) {
      setEditError('Almeno una voce è obbligatoria')
      return
    }

    setSaving(true)
    setEditError('')
    try {
      const body: Record<string, unknown> = {
        title: editTitle,
        notes: editNotes || null,
        taxRate: editTaxRate,
        discount: editDiscount,
        validUntil: editValidUntil ? new Date(editValidUntil).toISOString() : null,
        lineItems: editLineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      }

      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setEditing(false)
        fetchQuote()
      } else {
        const data = await res.json().catch(() => null)
        setEditError(data?.error || 'Errore nel salvataggio')
      }
    } catch {
      setEditError('Errore di connessione')
    } finally {
      setSaving(false)
    }
  }

  async function handleSendQuote() {
    if (!quote) return
    setSending(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })
      if (res.ok) {
        fetchQuote()
      }
    } finally {
      setSending(false)
    }
  }

  async function handleConvertToInvoice() {
    if (!quote) return
    setConverting(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.id,
          clientId: quote.client.id,
          title: quote.title,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        router.push(`/erp/invoices/${json.data?.id || json.id}`)
      }
    } finally {
      setConverting(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/erp/quotes')
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || 'Errore nella cancellazione')
      }
    } finally {
      setDeleting(false)
      setConfirmDeleteOpen(false)
    }
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

  if (!quote) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Preventivo non trovato.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/erp/quotes')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Torna alla lista
        </Button>
      </div>
    )
  }

  const discountNum = parseFloat(quote.discount) || 0
  const canEdit = quote.status === 'DRAFT' || quote.status === 'SENT'

  return (
    <div>
      <button
        onClick={() => router.push('/erp/quotes')}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Torna ai preventivi
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold">{quote.number}</h1>
            <Badge status={quote.status}>
              {STATUS_LABELS[quote.status] || quote.status}
            </Badge>
          </div>
          {!editing && <p className="text-muted mt-1 truncate">{quote.title}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={startEditing} className="touch-manipulation">
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Modifica</span>
              </Button>
              {quote.status === 'DRAFT' && (
                <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)} className="touch-manipulation">
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Elimina</span>
                </Button>
              )}
            </>
          )}
          {editing && (
            <>
              <Button variant="outline" size="sm" onClick={cancelEditing} className="touch-manipulation">
                <X className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Annulla</span>
              </Button>
              <Button size="sm" onClick={handleSave} loading={saving} className="touch-manipulation">
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Salva</span>
              </Button>
            </>
          )}
          {!editing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowPdfPreview(true)} className="touch-manipulation">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Anteprima</span>
              </Button>
              <QuotePdfButton quoteId={quote.id} quoteNumber={quote.number} />
              {quote.status === 'DRAFT' && (
                <Button variant="outline" size="sm" onClick={handleSendQuote} loading={sending} className="touch-manipulation">
                  <Send className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Invia</span>
                </Button>
              )}
              {(quote.status === 'APPROVED' || quote.status === 'SENT') && (
                <Button size="sm" onClick={() => setConfirmConvertOpen(true)} className="touch-manipulation">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Converti in </span>Fattura
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {editError && (
        <div className="mb-4 p-3 rounded-md text-sm bg-destructive/10 text-destructive border border-destructive/20">
          {editError}
        </div>
      )}

      {/* Title edit */}
      {editing && (
        <Card className="mb-6">
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Titolo"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <Input
                label="Valido fino al"
                type="date"
                value={editValidUntil}
                onChange={(e) => setEditValidUntil(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent>
          <CardTitle className="mb-3">Dati Cliente</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted">Ragione Sociale:</span>
              <span className="ml-2 font-medium">{quote.client.companyName}</span>
            </div>
            {quote.client.vatNumber && (
              <div>
                <span className="text-muted">P.IVA:</span>
                <span className="ml-2">{quote.client.vatNumber}</span>
              </div>
            )}
            {quote.client.pec && (
              <div>
                <span className="text-muted">PEC:</span>
                <span className="ml-2">{quote.client.pec}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Voci</CardTitle>
            {editing && (
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi voce
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              {editLineItems.map((item, index) => (
                <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_80px_120px] gap-2">
                    <Input
                      placeholder="Descrizione"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Prezzo"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-sm font-medium min-w-[70px] text-right">
                      {formatCurrency(String(item.quantity * item.unitPrice))}
                    </span>
                    <button
                      onClick={() => removeLineItem(index)}
                      className="p-1.5 rounded-md text-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
                      disabled={editLineItems.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
                  {quote.lineItems
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
          )}

          {editing ? (
            <div className="mt-4 pt-4 border-t border-border space-y-3 max-w-sm ml-auto">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotale</span>
                <span>{formatCurrency(String(editSubtotal))}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-muted whitespace-nowrap">Sconto</label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editDiscount}
                  onChange={(e) => setEditDiscount(Number(e.target.value) || 0)}
                  className="w-28 text-right"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-muted whitespace-nowrap">IVA %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editTaxRate}
                  onChange={(e) => setEditTaxRate(Number(e.target.value) || 0)}
                  className="w-28 text-right"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">IVA ({editTaxRate}%)</span>
                <span>{formatCurrency(String(editTaxAmount))}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border text-base font-bold">
                <span>Totale</span>
                <span>{formatCurrency(String(editTotal))}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm max-w-xs ml-auto">
              <div className="flex justify-between">
                <span className="text-muted">Subtotale</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              {discountNum > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Sconto</span>
                  <span className="text-destructive">-{formatCurrency(quote.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">IVA ({quote.taxRate}%)</span>
                <span>{formatCurrency(quote.taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border text-base font-bold">
                <span>Totale</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {editing ? (
        <Card className="mb-6">
          <CardContent>
            <Textarea
              label="Note"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Note aggiuntive..."
              rows={3}
            />
          </CardContent>
        </Card>
      ) : quote.notes ? (
        <Card>
          <CardContent>
            <CardTitle className="mb-2">Note</CardTitle>
            <p className="text-sm text-muted whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <PdfPreviewModal
        open={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        pdfUrl={`/api/quotes/${quote.id}/pdf`}
        fileName={`${quote.number}.pdf`}
        title={`Anteprima - ${quote.number}`}
      />

      <Modal open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} title="Elimina Preventivo" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Confermi di voler eliminare il preventivo <strong>{quote.number}</strong>? Questa azione non puo essere annullata.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmConvertOpen} onClose={() => setConfirmConvertOpen(false)} title="Converti in Fattura" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Confermi di voler convertire il preventivo <strong>{quote.number}</strong> in fattura? Il preventivo verra segnato come &quot;Fatturato&quot;.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmConvertOpen(false)}>Annulla</Button>
            <Button onClick={handleConvertToInvoice} loading={converting}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Conferma Conversione
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
