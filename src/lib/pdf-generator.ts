import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont, PDFImage } from 'pdf-lib'
import { hexToRgb, drawText, drawTextRight as rightAlignText, wrapText, formatEur } from '@/lib/pdf-utils'

// ─── Types ──────────────────────────────────────────────────

export interface PdfLineItem {
  description: string
  quantity: number
  unitPrice: number | string
  total: number | string
}

export interface PdfDocumentData {
  documentType: 'PREVENTIVO' | 'FATTURA' | 'NOTA_DI_CREDITO'
  number: string
  title: string
  date: string
  validUntil?: string | null

  logoBytes?: Uint8Array | null
  logoMimeType?: string

  company: {
    ragioneSociale: string
    partitaIva: string
    codiceFiscale?: string | null
    indirizzo: string
    cap: string
    citta: string
    provincia: string
    pec?: string | null
    telefono?: string | null
    email?: string | null
    iban?: string | null
    siteUrl?: string | null
  }

  client: {
    companyName: string
    vatNumber?: string | null
    fiscalCode?: string | null
    pec?: string | null
    address?: string | null
  }

  lineItems: PdfLineItem[]
  subtotal: number | string
  discount: number | string
  taxRate: number | string
  taxAmount: number | string
  total: number | string

  notes?: string | null
  termsAndConditions?: string | null
  paymentTerms?: string | null
  paymentInfo?: {
    iban?: string
    method?: string
    dueDate?: string
  }

  primaryColor?: string
  secondaryColor?: string
}

function parseNumber(val: number | string): number {
  return typeof val === 'string' ? parseFloat(val) || 0 : val
}

// ─── Logo Fetch Helper ──────────────────────────────────────

export async function fetchLogoBytes(logoUrl: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
  try {
    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    const buffer = await res.arrayBuffer()
    const mime = contentType.includes('png') ? 'image/png' : 'image/jpeg'
    return { bytes: new Uint8Array(buffer), mime }
  } catch {
    return null
  }
}

// ─── Document Type Labels ───────────────────────────────────

const DOC_TYPE_LABELS: Record<string, string> = {
  PREVENTIVO: 'PREVENTIVO',
  FATTURA: 'FATTURA',
  NOTA_DI_CREDITO: 'NOTA DI CREDITO',
}

// ─── Main Generator ─────────────────────────────────────────

export async function generateDocumentPdf(data: PdfDocumentData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const helvetica = await doc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const primaryHex = data.primaryColor || '#3B82F6'
  const secondaryHex = data.secondaryColor || '#1E293B'
  const primary = hexToRgb(primaryHex)
  const secondary = hexToRgb(secondaryHex)
  const primaryRgb = rgb(primary.r, primary.g, primary.b)
  const secondaryRgb = rgb(secondary.r, secondary.g, secondary.b)
  const grayText = rgb(0.4, 0.4, 0.4)
  const darkText = rgb(0.1, 0.1, 0.1)
  const white = rgb(1, 1, 1)
  const lightBg = rgb(0.97, 0.97, 0.98)
  const borderColor = rgb(0.9, 0.9, 0.9)

  const PAGE_W = 595.28
  const PAGE_H = 841.89
  const MARGIN = 50
  const CONTENT_W = PAGE_W - MARGIN * 2
  const FOOTER_H = 55

  // Embed logo if available
  let logoImage: PDFImage | null = null
  if (data.logoBytes) {
    try {
      logoImage = data.logoMimeType === 'image/png'
        ? await doc.embedPng(data.logoBytes)
        : await doc.embedJpg(data.logoBytes)
    } catch {
      // Logo embed failed, continue without
    }
  }

  let page = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  // ═══ HEADER BAR (90px) ════════════════════════════════════

  const headerH = 90
  page.drawRectangle({ x: 0, y: PAGE_H - headerH, width: PAGE_W, height: headerH, color: secondaryRgb })

  let headerTextX = MARGIN

  // Logo in header
  if (logoImage) {
    const logoMaxH = 50
    const logoMaxW = 80
    const logoAspect = logoImage.width / logoImage.height
    let logoW = logoMaxH * logoAspect
    let logoH = logoMaxH
    if (logoW > logoMaxW) {
      logoW = logoMaxW
      logoH = logoMaxW / logoAspect
    }
    const logoY = PAGE_H - headerH + (headerH - logoH) / 2
    page.drawImage(logoImage, { x: MARGIN, y: logoY, width: logoW, height: logoH })
    headerTextX = MARGIN + logoW + 15
  }

  // Company name
  const companyName = data.company.ragioneSociale
  drawText(page, companyName, headerTextX, PAGE_H - 40, helveticaBold, 16, white)

  // Sub-info line
  const subParts: string[] = []
  if (data.company.partitaIva) subParts.push(`P.IVA ${data.company.partitaIva}`)
  if (data.company.telefono) subParts.push(data.company.telefono)
  if (data.company.email) subParts.push(data.company.email)
  if (subParts.length) {
    drawText(page, subParts.join('  |  '), headerTextX, PAGE_H - 57, helvetica, 8, rgb(0.8, 0.8, 0.8))
  }
  // Second sub-info line (address)
  const addrLine = `${data.company.indirizzo}, ${data.company.cap} ${data.company.citta} (${data.company.provincia})`
  drawText(page, addrLine, headerTextX, PAGE_H - 69, helvetica, 7, rgb(0.7, 0.7, 0.7))

  // Document number badge (right)
  const docNum = data.number
  const badgeW = helveticaBold.widthOfTextAtSize(docNum, 12) + 20
  const badgeX = PAGE_W - MARGIN - badgeW
  const badgeY = PAGE_H - 50
  page.drawRectangle({ x: badgeX, y: badgeY, width: badgeW, height: 24, color: primaryRgb, borderColor: primaryRgb, borderWidth: 0 })
  drawText(page, docNum, badgeX + 10, badgeY + 7, helveticaBold, 12, white)

  y = PAGE_H - headerH - 25

  // ═══ DOCUMENT TYPE + TITLE ════════════════════════════════

  drawText(page, DOC_TYPE_LABELS[data.documentType] || data.documentType, MARGIN, y, helveticaBold, 11, primaryRgb)
  y -= 18
  const titleLines = wrapText(data.title, helveticaBold, 13, CONTENT_W)
  for (const line of titleLines) {
    drawText(page, line, MARGIN, y, helveticaBold, 13, darkText)
    y -= 17
  }
  y -= 8

  // ═══ DATE + VALIDITY ══════════════════════════════════════

  drawText(page, 'Data:', MARGIN, y, helvetica, 9, grayText)
  drawText(page, data.date, MARGIN + 35, y, helveticaBold, 9, darkText)
  if (data.validUntil) {
    const col2X = MARGIN + CONTENT_W / 2
    drawText(page, 'Valido fino a:', col2X, y, helvetica, 9, grayText)
    drawText(page, data.validUntil, col2X + 75, y, helveticaBold, 9, darkText)
  }
  if (data.paymentInfo?.dueDate) {
    const col2X = MARGIN + CONTENT_W / 2
    drawText(page, 'Scadenza:', col2X, y, helvetica, 9, grayText)
    drawText(page, data.paymentInfo.dueDate, col2X + 55, y, helveticaBold, 9, darkText)
  }
  y -= 25

  // ═══ TWO-COLUMN INFO BOX ═════════════════════════════════

  const infoBoxH = 80
  const halfW = (CONTENT_W - 15) / 2

  // Company box (left)
  page.drawRectangle({ x: MARGIN, y: y - infoBoxH + 12, width: halfW, height: infoBoxH, color: lightBg, borderColor, borderWidth: 0.5 })
  let boxY = y
  drawText(page, 'DA', MARGIN + 10, boxY, helveticaBold, 8, primaryRgb)
  boxY -= 14
  drawText(page, data.company.ragioneSociale, MARGIN + 10, boxY, helveticaBold, 10, darkText)
  boxY -= 13
  drawText(page, `P.IVA: ${data.company.partitaIva}`, MARGIN + 10, boxY, helvetica, 8, grayText)
  boxY -= 11
  if (data.company.codiceFiscale) {
    drawText(page, `C.F.: ${data.company.codiceFiscale}`, MARGIN + 10, boxY, helvetica, 8, grayText)
    boxY -= 11
  }
  drawText(page, addrLine, MARGIN + 10, boxY, helvetica, 8, grayText)
  boxY -= 11
  if (data.company.pec) drawText(page, `PEC: ${data.company.pec}`, MARGIN + 10, boxY, helvetica, 8, grayText)

  // Client box (right)
  const clientBoxX = MARGIN + halfW + 15
  page.drawRectangle({ x: clientBoxX, y: y - infoBoxH + 12, width: halfW, height: infoBoxH, color: lightBg, borderColor, borderWidth: 0.5 })
  boxY = y
  drawText(page, 'DESTINATARIO', clientBoxX + 10, boxY, helveticaBold, 8, primaryRgb)
  boxY -= 14
  drawText(page, data.client.companyName, clientBoxX + 10, boxY, helveticaBold, 10, darkText)
  boxY -= 13
  if (data.client.vatNumber) {
    drawText(page, `P.IVA: ${data.client.vatNumber}`, clientBoxX + 10, boxY, helvetica, 8, grayText)
    boxY -= 11
  }
  if (data.client.fiscalCode) {
    drawText(page, `C.F.: ${data.client.fiscalCode}`, clientBoxX + 10, boxY, helvetica, 8, grayText)
    boxY -= 11
  }
  if (data.client.pec) {
    drawText(page, `PEC: ${data.client.pec}`, clientBoxX + 10, boxY, helvetica, 8, grayText)
    boxY -= 11
  }
  if (data.client.address) {
    const addrLines = wrapText(data.client.address, helvetica, 8, halfW - 20)
    for (const line of addrLines) {
      drawText(page, line, clientBoxX + 10, boxY, helvetica, 8, grayText)
      boxY -= 11
    }
  }

  y = y - infoBoxH - 10

  // ═══ LINE ITEMS TABLE ═════════════════════════════════════

  const colDesc = MARGIN
  const colQty = MARGIN + CONTENT_W * 0.52
  const colPrice = MARGIN + CONTENT_W * 0.67
  const colTotal = MARGIN + CONTENT_W * 0.84
  const tableHeaderH = 24

  function checkPageBreak(needed: number) {
    if (y < FOOTER_H + needed) {
      page = doc.addPage([PAGE_W, PAGE_H])
      y = PAGE_H - MARGIN
    }
  }

  checkPageBreak(tableHeaderH + 40)

  // Table header
  page.drawRectangle({ x: MARGIN, y: y - tableHeaderH + 12, width: CONTENT_W, height: tableHeaderH, color: secondaryRgb })
  drawText(page, 'Descrizione', colDesc + 10, y - 3, helveticaBold, 9, white)
  drawText(page, 'Qty', colQty + 5, y - 3, helveticaBold, 9, white)
  drawText(page, 'Prezzo Unit.', colPrice, y - 3, helveticaBold, 9, white)
  rightAlignText(page, 'Totale', MARGIN + CONTENT_W - 8, y - 3, helveticaBold, 9, white)
  y -= tableHeaderH + 4

  // Table rows
  for (let i = 0; i < data.lineItems.length; i++) {
    const item = data.lineItems[i]
    const descLines = wrapText(item.description, helvetica, 9, (colQty - colDesc) - 18)
    const rowH = Math.max(descLines.length * 13 + 8, 22)

    checkPageBreak(rowH + 10)

    // Alternate row background
    if (i % 2 === 0) {
      page.drawRectangle({ x: MARGIN, y: y - rowH + 14, width: CONTENT_W, height: rowH, color: rgb(0.98, 0.98, 0.99) })
    }

    // First line of description + qty + price + total
    drawText(page, descLines[0] || '', colDesc + 10, y, helvetica, 9, darkText)
    drawText(page, String(item.quantity), colQty + 5, y, helvetica, 9, darkText)
    drawText(page, formatEur(item.unitPrice), colPrice, y, helvetica, 9, darkText)
    rightAlignText(page, formatEur(item.total), MARGIN + CONTENT_W - 8, y, helveticaBold, 9, darkText)

    y -= 14
    for (let l = 1; l < descLines.length; l++) {
      drawText(page, descLines[l], colDesc + 10, y, helvetica, 8, grayText)
      y -= 12
    }
    y -= 6
  }

  // ═══ TOTALS ═══════════════════════════════════════════════

  y -= 8
  checkPageBreak(100)

  const totalsX = colPrice - 10
  const totalsValRight = MARGIN + CONTENT_W - 8

  page.drawLine({ start: { x: totalsX, y: y + 5 }, end: { x: MARGIN + CONTENT_W, y: y + 5 }, thickness: 0.5, color: borderColor })

  // Subtotal
  drawText(page, 'Subtotale', totalsX, y - 10, helvetica, 9, grayText)
  rightAlignText(page, formatEur(data.subtotal), totalsValRight, y - 10, helvetica, 9, darkText)

  // Discount
  const discountNum = parseNumber(data.discount)
  if (discountNum > 0) {
    y -= 17
    drawText(page, 'Sconto', totalsX, y - 10, helvetica, 9, grayText)
    rightAlignText(page, `-${formatEur(discountNum)}`, totalsValRight, y - 10, helvetica, 9, rgb(0.8, 0.2, 0.2))
  }

  // Tax
  y -= 17
  const taxRateNum = parseNumber(data.taxRate)
  drawText(page, `IVA (${taxRateNum}%)`, totalsX, y - 10, helvetica, 9, grayText)
  rightAlignText(page, formatEur(data.taxAmount), totalsValRight, y - 10, helvetica, 9, darkText)

  // Total box
  y -= 24
  const totalBoxW = MARGIN + CONTENT_W - totalsX + 10
  page.drawRectangle({ x: totalsX - 5, y: y - 16, width: totalBoxW, height: 26, color: primaryRgb })
  drawText(page, 'TOTALE', totalsX + 3, y - 8, helveticaBold, 11, white)
  rightAlignText(page, formatEur(data.total), totalsValRight, y - 8, helveticaBold, 11, white)

  y -= 40

  // ═══ PAYMENT INFO (invoices) ══════════════════════════════

  if (data.paymentInfo || data.paymentTerms) {
    checkPageBreak(80)
    drawText(page, 'MODALITA DI PAGAMENTO', MARGIN, y, helveticaBold, 9, primaryRgb)
    y -= 15

    const payBoxH = 50
    page.drawRectangle({ x: MARGIN, y: y - payBoxH + 12, width: CONTENT_W, height: payBoxH, color: lightBg, borderColor, borderWidth: 0.5 })

    if (data.paymentInfo?.iban) {
      drawText(page, 'IBAN:', MARGIN + 10, y, helveticaBold, 8, grayText)
      drawText(page, data.paymentInfo.iban, MARGIN + 45, y, helvetica, 9, darkText)
      y -= 14
    }
    if (data.paymentInfo?.method) {
      drawText(page, 'Metodo:', MARGIN + 10, y, helveticaBold, 8, grayText)
      drawText(page, data.paymentInfo.method, MARGIN + 55, y, helvetica, 9, darkText)
      y -= 14
    }
    if (data.paymentTerms) {
      drawText(page, 'Termini:', MARGIN + 10, y, helveticaBold, 8, grayText)
      drawText(page, data.paymentTerms, MARGIN + 55, y, helvetica, 9, darkText)
      y -= 14
    }
    y -= payBoxH - 30
  }

  // ═══ NOTES ════════════════════════════════════════════════

  if (data.notes) {
    checkPageBreak(60)
    drawText(page, 'NOTE', MARGIN, y, helveticaBold, 9, primaryRgb)
    y -= 14
    const noteLines = wrapText(data.notes, helvetica, 8, CONTENT_W)
    for (const line of noteLines) {
      checkPageBreak(20)
      drawText(page, line, MARGIN, y, helvetica, 8, grayText)
      y -= 12
    }
    y -= 10
  }

  // ═══ TERMS AND CONDITIONS ═════════════════════════════════

  if (data.termsAndConditions) {
    checkPageBreak(60)
    drawText(page, 'TERMINI E CONDIZIONI', MARGIN, y, helveticaBold, 9, primaryRgb)
    y -= 14
    const tcLines = wrapText(data.termsAndConditions, helvetica, 7, CONTENT_W)
    for (const line of tcLines) {
      checkPageBreak(20)
      drawText(page, line, MARGIN, y, helvetica, 7, grayText)
      y -= 10
    }
  }

  // ═══ FOOTER on all pages ══════════════════════════════════

  const pages = doc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    // Divider line
    p.drawLine({ start: { x: MARGIN, y: FOOTER_H - 15 }, end: { x: PAGE_W - MARGIN, y: FOOTER_H - 15 }, thickness: 0.5, color: borderColor })

    // Company data footer - line 1
    const footerParts1: string[] = [data.company.ragioneSociale]
    footerParts1.push(`${data.company.indirizzo}, ${data.company.cap} ${data.company.citta} (${data.company.provincia})`)
    const footerLine1 = footerParts1.join(' - ')
    drawText(p, footerLine1, MARGIN, FOOTER_H - 28, helvetica, 6.5, grayText)

    // Company data footer - line 2
    const footerParts2: string[] = []
    footerParts2.push(`P.IVA: ${data.company.partitaIva}`)
    if (data.company.codiceFiscale) footerParts2.push(`C.F.: ${data.company.codiceFiscale}`)
    if (data.company.pec) footerParts2.push(`PEC: ${data.company.pec}`)
    if (data.company.iban) footerParts2.push(`IBAN: ${data.company.iban}`)
    if (data.company.siteUrl) footerParts2.push(data.company.siteUrl)
    drawText(p, footerParts2.join('  |  '), MARGIN, FOOTER_H - 39, helvetica, 6.5, grayText)

    // Page number right-aligned
    const pageText = `Pagina ${i + 1} di ${pages.length}`
    const pageTextW = helvetica.widthOfTextAtSize(pageText, 7)
    drawText(p, pageText, PAGE_W - MARGIN - pageTextW, FOOTER_H - 28, helvetica, 7, grayText)
  }

  return doc.save()
}
