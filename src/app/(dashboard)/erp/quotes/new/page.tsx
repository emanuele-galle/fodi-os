'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { RichTextEditor } from '@/components/shared/RichTextEditor'
import { formatCurrency } from '@/lib/utils'

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
}

interface Client {
  id: string
  companyName: string
}

export default function NewQuotePage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [taxRate, setTaxRate] = useState(22)
  const [discount, setDiscount] = useState(0)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ])

  useEffect(() => {
    fetch('/api/clients?limit=200')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.items) setClients(d.items)
      })
  }, [])

  function addLineItem() {
    setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const taxableAmount = subtotal - discount
  const taxAmount = taxableAmount * (taxRate / 100)
  const total = taxableAmount + taxAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !title || lineItems.some((item) => !item.description)) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          title,
          notes: notes || undefined,
          validUntil: validUntil || undefined,
          taxRate,
          discount,
          lineItems: lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/erp/quotes/${data.id}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const clientOptions = [
    { value: '', label: 'Seleziona cliente...' },
    ...clients.map((c) => ({ value: c.id, label: c.companyName })),
  ]

  return (
    <div>
      <button
        onClick={() => router.push('/erp/quotes')}
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Torna ai preventivi
      </button>

      <h1 className="text-2xl font-bold mb-6">Nuovo Preventivo</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent>
            <CardTitle className="mb-4">Informazioni Generali</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Cliente *"
                options={clientOptions}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
              <Input
                label="Titolo *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="es. Sviluppo sito web"
              />
              <Input
                label="Valido fino a"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="IVA %"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                />
                <Input
                  label="Sconto (EUR)"
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Voci Preventivo</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi voce
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Descrizione *"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      required
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Prezzo"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-28 pt-2 text-sm font-medium text-right">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length <= 1}
                    className="mt-0.5"
                  >
                    <Trash2 className="h-4 w-4 text-muted" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm max-w-xs ml-auto">
              <div className="flex justify-between">
                <span className="text-muted">Subtotale</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Sconto</span>
                  <span className="text-destructive">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">IVA ({taxRate}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border text-base font-bold">
                <span>Totale</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <CardTitle className="mb-4">Note</CardTitle>
            <RichTextEditor
              content={notes}
              onChange={setNotes}
              placeholder="Note aggiuntive per il preventivo..."
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/erp/quotes')}>
            Annulla
          </Button>
          <Button type="submit" disabled={submitting || !clientId || !title}>
            {submitting ? 'Salvataggio...' : 'Crea Preventivo'}
          </Button>
        </div>
      </form>
    </div>
  )
}
