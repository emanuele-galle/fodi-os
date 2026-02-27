'use client'

import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'

export interface TemplateLineItem {
  description: string
  quantity: number
  unitPrice: number
  sortOrder: number
}

interface TemplateLineItemsEditorProps {
  items: TemplateLineItem[]
  onChange: (items: TemplateLineItem[]) => void
}

export function TemplateLineItemsEditor({ items, onChange }: TemplateLineItemsEditorProps) {
  function addItem() {
    onChange([...items, { description: '', quantity: 1, unitPrice: 0, sortOrder: items.length }])
  }

  function removeItem(index: number) {
    if (items.length <= 0) return
    onChange(items.filter((_, i) => i !== index).map((item, i) => ({ ...item, sortOrder: i })))
  }

  function updateItem(index: number, field: keyof TemplateLineItem, value: string | number) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= items.length) return
    const updated = [...items]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)
    onChange(updated.map((item, i) => ({ ...item, sortOrder: i })))
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-foreground">Voci predefinite</p>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 mr-1" />
          Aggiungi voce
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">Nessuna voce predefinita. Aggiungi la prima voce.</p>
      ) : (
        <div className="space-y-2">
          {/* Desktop header */}
          <div className="hidden md:flex items-center gap-3 px-2 text-xs text-muted font-medium">
            <div className="w-6" />
            <div className="flex-1">Descrizione</div>
            <div className="w-20 text-center">Qty</div>
            <div className="w-28 text-center">Prezzo Unit.</div>
            <div className="w-24 text-right">Totale</div>
            <div className="w-10" />
          </div>

          {items.map((item, index) => (
            <div key={index} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 p-3 md:p-2 rounded-lg border border-border/40 bg-card/50">
              {/* Reorder buttons */}
              <div className="hidden md:flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveItem(index, index - 1)}
                  disabled={index === 0}
                  className="text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile layout */}
              <div className="md:hidden space-y-2">
                <Input
                  placeholder="Descrizione *"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Prezzo"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                  <div className="flex items-center justify-end text-sm font-medium">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                    <Trash2 className="h-4 w-4 text-muted" />
                  </Button>
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden md:flex md:items-center md:gap-3 md:flex-1">
                <div className="flex-1">
                  <Input
                    placeholder="Descrizione *"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                  />
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="w-24 text-right text-sm font-medium">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} aria-label="Rimuovi voce">
                  <Trash2 className="h-4 w-4 text-muted" />
                </Button>
              </div>
            </div>
          ))}

          {items.length > 0 && (
            <div className="flex justify-end pt-2 text-sm">
              <span className="text-muted mr-3">Subtotale voci:</span>
              <span className="font-bold">{formatCurrency(subtotal)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
