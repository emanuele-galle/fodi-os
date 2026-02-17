'use client'

import { formatCurrency } from '@/lib/utils'
import type { TemplateLineItem } from './TemplateLineItemsEditor'

interface TemplatePreviewProps {
  name: string
  primaryColor: string
  secondaryColor: string
  logoUrl?: string
  numberPrefix: string
  numberFormat: string
  defaultTaxRate: number
  defaultDiscount: number
  defaultNotes: string
  termsAndConditions: string
  lineItems: TemplateLineItem[]
  companyName?: string
  companyProfile?: {
    ragioneSociale?: string
    partitaIva?: string
    indirizzo?: string
    cap?: string
    citta?: string
    provincia?: string
    pec?: string
    iban?: string
    telefono?: string
    email?: string
  }
}

export function TemplatePreview({
  name,
  primaryColor,
  secondaryColor,
  logoUrl,
  numberPrefix,
  numberFormat,
  defaultTaxRate,
  defaultDiscount,
  defaultNotes,
  termsAndConditions,
  lineItems,
  companyName = 'FODI S.R.L.',
  companyProfile,
}: TemplatePreviewProps) {
  const year = new Date().getFullYear()
  const sampleNumber = numberFormat
    .replace('{PREFIX}', numberPrefix)
    .replace('{YYYY}', String(year))
    .replace('{NNN}', '001')

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const discountAmount = defaultDiscount
  const taxableAmount = subtotal - discountAmount
  const taxAmount = taxableAmount * (defaultTaxRate / 100)
  const total = taxableAmount + taxAmount

  const displayDate = new Date().toLocaleDateString('it-IT')

  // Company info defaults
  const ragioneSociale = companyProfile?.ragioneSociale || companyName
  const partitaIva = companyProfile?.partitaIva || '03856160793'
  const indirizzo = companyProfile?.indirizzo || 'Via Roma'
  const cap = companyProfile?.cap || '89822'
  const citta = companyProfile?.citta || 'Serra San Bruno'
  const provincia = companyProfile?.provincia || 'VV'
  const telefono = companyProfile?.telefono || '+39 0963 576433'
  const email = companyProfile?.email || 'info@fodisrl.it'
  const pec = companyProfile?.pec
  const iban = companyProfile?.iban

  // Truncate T&C to ~4 lines
  const truncatedTerms = termsAndConditions
    ? termsAndConditions.split('\n').slice(0, 4).join('\n') + (termsAndConditions.split('\n').length > 4 ? ' ...' : '')
    : ''

  return (
    <div className="bg-white rounded-lg shadow-sm border border-border/40 overflow-hidden text-[10px] leading-snug" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Header */}
      <div className="px-4 py-3" style={{ backgroundColor: secondaryColor }}>
        <div className="flex justify-between items-start">
          {/* Left: Logo + Company Info */}
          <div className="flex items-start gap-2">
            {(logoUrl || true) && (
              <img
                src={logoUrl || '/logo-official.png'}
                alt="Logo"
                style={{ maxHeight: '40px', width: 'auto' }}
                className="rounded-sm flex-shrink-0"
              />
            )}
            <div className="text-white">
              <div className="font-bold text-[11px]">{ragioneSociale}</div>
              <div className="text-white/80 text-[8px] leading-tight mt-0.5">
                <div>P.IVA: {partitaIva}</div>
                <div>{indirizzo}, {cap} {citta} ({provincia})</div>
                <div>Tel: {telefono} | {email}</div>
                {pec && <div>PEC: {pec}</div>}
              </div>
            </div>
          </div>

          {/* Right: Quote number + Date */}
          <div className="text-right text-white flex-shrink-0 ml-3">
            <div className="text-[8px] uppercase tracking-wider text-white/60 font-medium">Preventivo</div>
            <div className="font-bold text-[11px] font-mono">{sampleNumber}</div>
            <div className="text-[8px] text-white/70 mt-0.5">Data: {displayDate}</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        {/* Template Name */}
        <div className="text-center">
          <span className="font-bold text-[11px]" style={{ color: primaryColor }}>{name || 'Nome template'}</span>
        </div>

        {/* Client Section */}
        <div className="border rounded p-2" style={{ borderColor: primaryColor + '30' }}>
          <div className="text-[8px] uppercase tracking-wider font-bold mb-0.5" style={{ color: primaryColor }}>
            Spett.le Cliente
          </div>
          <div className="text-[9px] text-gray-400 italic">
            <div>Ragione Sociale / Nome Cognome</div>
            <div>Indirizzo, CAP Citta (Prov)</div>
            <div>P.IVA / C.F.</div>
          </div>
        </div>

        {/* Line Items Table */}
        {lineItems.length > 0 && (
          <div>
            <div className="rounded overflow-hidden border" style={{ borderColor: primaryColor + '20' }}>
              {/* Table header */}
              <div
                className="flex text-white text-[8px] font-semibold uppercase tracking-wider px-2 py-1.5"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="w-5 text-center">#</span>
                <span className="flex-1 pl-1">Descrizione</span>
                <span className="w-8 text-center">Qty</span>
                <span className="w-16 text-right">Prezzo Unit.</span>
                <span className="w-16 text-right">Totale</span>
              </div>
              {/* Table rows */}
              {lineItems.map((item, i) => (
                <div
                  key={i}
                  className="flex px-2 py-1 text-[9px] items-center"
                  style={{
                    backgroundColor: i % 2 === 0 ? secondaryColor + '08' : 'transparent',
                    borderBottom: i < lineItems.length - 1 ? `1px solid ${primaryColor}10` : 'none',
                  }}
                >
                  <span className="w-5 text-center text-gray-400 text-[8px]">{i + 1}</span>
                  <span className="flex-1 pl-1 truncate">{item.description || '...'}</span>
                  <span className="w-8 text-center text-gray-500">{item.quantity}</span>
                  <span className="w-16 text-right text-gray-600">{formatCurrency(item.unitPrice)}</span>
                  <span className="w-16 text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-2 ml-auto" style={{ maxWidth: '200px' }}>
              <div className="space-y-0.5 text-[9px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotale</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sconto</span>
                    <span className="text-red-500">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Imponibile</span>
                    <span>{formatCurrency(taxableAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">IVA ({defaultTaxRate}%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div
                  className="flex justify-between pt-1 mt-1 font-bold text-[10px]"
                  style={{ borderTop: `2px solid ${primaryColor}` }}
                >
                  <span style={{ color: primaryColor }}>TOTALE</span>
                  <span
                    className="text-white px-2 py-0.5 rounded"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {defaultNotes && (
          <div className="bg-gray-50 rounded p-2">
            <div className="text-[8px] uppercase tracking-wider font-bold mb-0.5" style={{ color: primaryColor }}>
              Note
            </div>
            <p className="text-gray-500 text-[9px] leading-snug">{defaultNotes}</p>
          </div>
        )}

        {/* Terms & Conditions */}
        {termsAndConditions && (
          <div className="border-t pt-1.5" style={{ borderColor: primaryColor + '20' }}>
            <div className="text-[8px] uppercase tracking-wider font-bold mb-0.5" style={{ color: primaryColor }}>
              Termini e Condizioni
            </div>
            <p className="text-gray-400 text-[8px] leading-snug whitespace-pre-line">{truncatedTerms}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 space-y-0.5" style={{ backgroundColor: secondaryColor + '0A', borderTop: `1px solid ${secondaryColor}20` }}>
        {iban && (
          <div className="text-[8px] text-gray-500 text-center">
            <span className="font-semibold">IBAN:</span> {iban}
          </div>
        )}
        <div className="text-[7px] text-gray-400 text-center italic">
          Startup Innovativa MISE - Premio America Innovazione 2023
        </div>
        <div className="text-[7px] text-gray-400 text-center">
          {ragioneSociale} - {indirizzo}, {cap} {citta} ({provincia}) - P.IVA {partitaIva}
        </div>
      </div>
    </div>
  )
}
