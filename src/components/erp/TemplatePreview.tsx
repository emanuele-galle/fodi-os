'use client'

import { formatCurrency } from '@/lib/utils'
import type { TemplateLineItem } from './TemplateLineItemsEditor'

interface TemplatePreviewProps {
  name: string
  primaryColor: string
  secondaryColor: string
  numberPrefix: string
  numberFormat: string
  defaultTaxRate: number
  defaultDiscount: number
  defaultNotes: string
  termsAndConditions: string
  lineItems: TemplateLineItem[]
  companyName?: string
}

export function TemplatePreview({
  name,
  primaryColor,
  secondaryColor,
  numberPrefix,
  numberFormat,
  defaultTaxRate,
  defaultDiscount,
  defaultNotes,
  termsAndConditions,
  lineItems,
  companyName = 'La Tua Azienda',
}: TemplatePreviewProps) {
  const year = new Date().getFullYear()
  const sampleNumber = numberFormat
    .replace('{PREFIX}', numberPrefix)
    .replace('{YYYY}', String(year))
    .replace('{NNN}', '001')

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const taxableAmount = subtotal - defaultDiscount
  const taxAmount = taxableAmount * (defaultTaxRate / 100)
  const total = taxableAmount + taxAmount

  return (
    <div className="bg-white rounded-lg shadow-sm border border-border/40 overflow-hidden text-[11px] leading-relaxed">
      {/* Header */}
      <div className="px-4 py-3" style={{ backgroundColor: secondaryColor }}>
        <div className="flex justify-between items-center">
          <span className="text-white font-bold text-sm">{companyName}</span>
          <span className="text-white/90 font-mono text-xs">{sampleNumber}</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <span className="font-bold text-xs" style={{ color: primaryColor }}>PREVENTIVO</span>
          <p className="font-semibold text-foreground mt-0.5">{name || 'Nome template'}</p>
        </div>

        {/* Info */}
        <div className="flex gap-6 text-muted text-[10px]">
          <div>
            <span className="text-muted">Data:</span> {new Date().toLocaleDateString('it-IT')}
          </div>
          <div>
            <span className="text-muted">Valido fino:</span> ...
          </div>
        </div>

        {/* Client placeholder */}
        <div className="bg-gray-50 rounded p-2">
          <span className="text-[10px] font-bold" style={{ color: primaryColor }}>CLIENTE</span>
          <p className="text-muted text-[10px] mt-0.5">Dati cliente compilati alla creazione</p>
        </div>

        {/* Line items */}
        {lineItems.length > 0 && (
          <div>
            <div className="rounded overflow-hidden">
              <div className="flex text-white text-[9px] font-medium px-2 py-1" style={{ backgroundColor: secondaryColor }}>
                <span className="flex-1">Descrizione</span>
                <span className="w-10 text-center">Qty</span>
                <span className="w-16 text-right">Prezzo</span>
                <span className="w-16 text-right">Totale</span>
              </div>
              {lineItems.map((item, i) => (
                <div key={i} className={`flex px-2 py-1 text-[10px] ${i % 2 === 0 ? 'bg-gray-50' : ''}`}>
                  <span className="flex-1 truncate">{item.description || '...'}</span>
                  <span className="w-10 text-center">{item.quantity}</span>
                  <span className="w-16 text-right">{formatCurrency(item.unitPrice)}</span>
                  <span className="w-16 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-2 space-y-0.5 text-right text-[10px]">
              <div className="flex justify-end gap-4">
                <span className="text-muted">Subtotale</span>
                <span className="w-20">{formatCurrency(subtotal)}</span>
              </div>
              {defaultDiscount > 0 && (
                <div className="flex justify-end gap-4">
                  <span className="text-muted">Sconto</span>
                  <span className="w-20 text-red-500">-{formatCurrency(defaultDiscount)}</span>
                </div>
              )}
              <div className="flex justify-end gap-4">
                <span className="text-muted">IVA ({defaultTaxRate}%)</span>
                <span className="w-20">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-end gap-4 pt-1 border-t border-border/30 font-bold text-[11px]">
                <span>Totale</span>
                <span className="w-20 text-white px-2 py-0.5 rounded" style={{ backgroundColor: primaryColor }}>
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {defaultNotes && (
          <div className="text-[9px]">
            <span className="font-bold" style={{ color: primaryColor }}>NOTE</span>
            <p className="text-muted mt-0.5 line-clamp-2">{defaultNotes}</p>
          </div>
        )}

        {/* T&C */}
        {termsAndConditions && (
          <div className="text-[9px]">
            <span className="font-bold" style={{ color: primaryColor }}>T&C</span>
            <p className="text-muted mt-0.5 line-clamp-2">{termsAndConditions}</p>
          </div>
        )}
      </div>
    </div>
  )
}
