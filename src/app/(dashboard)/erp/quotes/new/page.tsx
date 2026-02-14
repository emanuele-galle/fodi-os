'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'

const RichTextEditor = dynamic(() => import('@/components/shared/RichTextEditor').then(m => ({ default: m.RichTextEditor })), {
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full rounded-lg" />,
})

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
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [newClientData, setNewClientData] = useState({
    companyName: '',
    vatNumber: '',
    pec: '',
    phone: '',
  })
  const [newClientError, setNewClientError] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

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

  async function handleCreateClient() {
    if (!newClientData.companyName.trim()) {
      setNewClientError('Ragione sociale obbligatoria')
      return
    }
    setCreatingClient(true)
    setNewClientError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: newClientData.companyName.trim(),
          vatNumber: newClientData.vatNumber.trim() || undefined,
          pec: newClientData.pec.trim() || undefined,
          status: 'ACTIVE',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setNewClientError(err.error || 'Errore nella creazione del cliente')
        return
      }
      const created = await res.json()
      setClients((prev) => [created, ...prev])
      setClientId(created.id)
      setShowNewClientModal(false)
      setNewClientData({ companyName: '', vatNumber: '', pec: '', phone: '' })

      // Se e' stato fornito un telefono, crea un contatto primario
      if (newClientData.phone.trim()) {
        fetch(`/api/clients/${created.id}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: newClientData.companyName.trim(),
            lastName: 'Contatto',
            phone: newClientData.phone.trim(),
            isPrimary: true,
          }),
        })
      }
    } finally {
      setCreatingClient(false)
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

      <h1 className="text-xl md:text-2xl font-semibold mb-6">Nuovo Preventivo</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent>
            <CardTitle className="mb-4">Informazioni Generali</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      label="Cliente *"
                      options={clientOptions}
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 px-3"
                    onClick={() => setShowNewClientModal(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Nuovo
                  </Button>
                </div>
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div key={index}>
                  {/* Mobile: stack verticale */}
                  <div className="md:hidden space-y-2 p-3 bg-secondary/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Descrizione *"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-muted" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="Prezzo"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      />
                      <div className="flex items-center justify-end text-sm font-medium">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                  </div>
                  {/* Desktop: flex row */}
                  <div className="hidden md:flex items-start gap-3">
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

        <div className="flex justify-end gap-3 sticky bottom-0 bg-background/95 backdrop-blur-sm py-4 -mx-4 px-4 md:static md:bg-transparent md:backdrop-blur-none md:py-0 md:mx-0 md:px-0 border-t border-border/50 md:border-0">
          <Button type="button" variant="outline" onClick={() => router.push('/erp/quotes')}>
            Annulla
          </Button>
          <Button type="submit" disabled={submitting || !clientId || !title}>
            {submitting ? 'Salvataggio...' : 'Crea Preventivo'}
          </Button>
        </div>
      </form>

      <Modal
        open={showNewClientModal}
        onClose={() => {
          setShowNewClientModal(false)
          setNewClientError('')
        }}
        title="Nuovo Cliente"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Ragione Sociale *"
            value={newClientData.companyName}
            onChange={(e) => setNewClientData((d) => ({ ...d, companyName: e.target.value }))}
            placeholder="es. Acme S.r.l."
          />
          <Input
            label="P.IVA"
            value={newClientData.vatNumber}
            onChange={(e) => setNewClientData((d) => ({ ...d, vatNumber: e.target.value }))}
            placeholder="es. IT01234567890"
          />
          <Input
            label="Email / PEC"
            type="email"
            value={newClientData.pec}
            onChange={(e) => setNewClientData((d) => ({ ...d, pec: e.target.value }))}
            placeholder="es. info@azienda.it"
          />
          <Input
            label="Telefono"
            type="tel"
            value={newClientData.phone}
            onChange={(e) => setNewClientData((d) => ({ ...d, phone: e.target.value }))}
            placeholder="es. +39 02 1234567"
          />
          {newClientError && (
            <p className="text-sm text-destructive">{newClientError}</p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewClientModal(false)
                setNewClientError('')
              }}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={handleCreateClient}
              disabled={creatingClient || !newClientData.companyName.trim()}
            >
              {creatingClient ? 'Creazione...' : 'Crea Cliente'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
