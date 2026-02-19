/** Calcola netto e IVA da importo lordo e aliquota */
export function calculateVat(grossAmount: number, vatRate: string): { net: number; vat: number } {
  const rate = parseFloat(vatRate) / 100
  if (rate === 0) return { net: grossAmount, vat: 0 }
  const net = grossAmount / (1 + rate)
  const vat = grossAmount - net
  return { net: Math.round(net * 100) / 100, vat: Math.round(vat * 100) / 100 }
}

/** Calcola IVA detraibile */
export function calculateDeductibleVat(vatAmount: number, deductibility: string): number {
  const pct = parseFloat(deductibility) / 100
  return Math.round(vatAmount * pct * 100) / 100
}

/** Formatta numero in stile contabile italiano (es. "1.234,56 €") */
export function formatAccountingNumber(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}
