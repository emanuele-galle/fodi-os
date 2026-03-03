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

/** Genera il prossimo numero fattura per l'anno corrente (formato FT-YYYY/NNN) */
export async function generateInvoiceNumber(
  prisma: { income: { findFirst: (args: { where: { invoiceNumber: { startsWith: string } }; orderBy: { invoiceNumber: 'desc' }; select: { invoiceNumber: true } }) => Promise<{ invoiceNumber: string | null } | null> } },
  year?: number
): Promise<string> {
  const y = year ?? new Date().getFullYear()
  const prefix = `FT-${y}/`

  const latest = await prisma.income.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })

  let nextNum = 1
  if (latest?.invoiceNumber) {
    const parts = latest.invoiceNumber.split('/')
    const num = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(num)) nextNum = num + 1
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

