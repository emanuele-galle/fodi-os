import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib'
import type { ContractTemplate, ContractClause } from './contract-templates'
import { fetchLogoBytes } from './pdf-generator'
import { hexToRgb, drawText, drawTextCenter as centerText, wrapText } from '@/lib/pdf-utils'

// ─── Types ──────────────────────────────────────────────────

interface ContractPdfData {
  template: ContractTemplate
  contractNumber: string
  date: string
  city: string

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
    legalRepresentative?: string | null
    vatNumber?: string | null
    fiscalCode?: string | null
    address?: string | null
    pec?: string | null
    email?: string | null
    phone?: string | null
  }

  // Custom field replacements (e.g., amounts, durations)
  customFields?: Record<string, string>

  logoUrl?: string | null
  primaryColor?: string
  secondaryColor?: string
}

// ─── Main Generator ─────────────────────────────────────────

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function generateContractPdf(data: ContractPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const helvetica = await doc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique)

  const primaryHex = data.primaryColor || '#1a1a2e'
  const secondaryHex = data.secondaryColor || '#16213e'
  const primary = hexToRgb(primaryHex)
  const secondary = hexToRgb(secondaryHex)
  const primaryRgb = rgb(primary.r, primary.g, primary.b)
  const secondaryRgb = rgb(secondary.r, secondary.g, secondary.b)
  const grayText = rgb(0.4, 0.4, 0.4)
  const darkText = rgb(0.15, 0.15, 0.15)
  const white = rgb(1, 1, 1)
  const lightBg = rgb(0.97, 0.97, 0.98)
  const borderColor = rgb(0.88, 0.88, 0.88)

  const PAGE_W = 595.28
  const PAGE_H = 841.89
  const MARGIN = 55
  const CONTENT_W = PAGE_W - MARGIN * 2
  const FOOTER_H = 50

  // Embed logo
  let logoImage = null
  if (data.logoUrl) {
    const logoData = await fetchLogoBytes(data.logoUrl)
    if (logoData) {
      try {
        logoImage = logoData.mime === 'image/png'
          ? await doc.embedPng(logoData.bytes)
          : await doc.embedJpg(logoData.bytes)
      } catch { /* skip logo on error */ }
    }
  }

  let page = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H - MARGIN

  function checkPageBreak(needed: number) {
    if (y < FOOTER_H + needed) {
      page = doc.addPage([PAGE_W, PAGE_H])
      y = PAGE_H - MARGIN
    }
  }

  // Helper to replace custom fields in text
  function replaceFields(text: string): string {
    if (!data.customFields) return text
    let result = text
    for (const [key, value] of Object.entries(data.customFields)) {
      result = result.replace(new RegExp(`________`, 'g'), value)
    }
    return result
  }

  // ═══ HEADER BAR ══════════════════════════════════════════

  const headerH = 80
  page.drawRectangle({ x: 0, y: PAGE_H - headerH, width: PAGE_W, height: headerH, color: secondaryRgb })

  let headerTextX = MARGIN

  if (logoImage) {
    const logoMaxH = 45
    const logoMaxW = 70
    const logoAspect = logoImage.width / logoImage.height
    let logoW = logoMaxH * logoAspect
    let logoH = logoMaxH
    if (logoW > logoMaxW) { logoW = logoMaxW; logoH = logoMaxW / logoAspect }
    page.drawImage(logoImage, { x: MARGIN, y: PAGE_H - headerH + (headerH - logoH) / 2, width: logoW, height: logoH })
    headerTextX = MARGIN + logoW + 12
  }

  drawText(page, data.company.ragioneSociale, headerTextX, PAGE_H - 38, helveticaBold, 14, white)

  const subParts: string[] = []
  if (data.company.partitaIva) subParts.push(`P.IVA ${data.company.partitaIva}`)
  if (data.company.telefono) subParts.push(data.company.telefono)
  if (data.company.email) subParts.push(data.company.email)
  if (subParts.length) drawText(page, subParts.join('  |  '), headerTextX, PAGE_H - 53, helvetica, 7.5, rgb(0.8, 0.8, 0.8))
  drawText(page, `${data.company.indirizzo}, ${data.company.cap} ${data.company.citta} (${data.company.provincia})`, headerTextX, PAGE_H - 64, helvetica, 7, rgb(0.7, 0.7, 0.7))

  // Contract number badge
  const badgeText = data.contractNumber
  const badgeW = helveticaBold.widthOfTextAtSize(badgeText, 10) + 20
  page.drawRectangle({ x: PAGE_W - MARGIN - badgeW, y: PAGE_H - 48, width: badgeW, height: 22, color: primaryRgb })
  drawText(page, badgeText, PAGE_W - MARGIN - badgeW + 10, PAGE_H - 42, helveticaBold, 10, white)

  y = PAGE_H - headerH - 30

  // ═══ CONTRACT TITLE ════════════════════════════════════════

  centerText(page, data.template.name.toUpperCase(), y, helveticaBold, 16, PAGE_W, primaryRgb)
  y -= 20

  // Decorative line
  const lineX = (PAGE_W - 120) / 2
  page.drawRectangle({ x: lineX, y: y, width: 120, height: 2, color: primaryRgb })
  y -= 20

  // Date and place
  centerText(page, `${data.city}, ${data.date}`, y, helveticaOblique, 10, PAGE_W, grayText)
  y -= 30

  // ═══ PARTIES INFO ══════════════════════════════════════════

  const boxH = 85
  const halfW = (CONTENT_W - 15) / 2

  // Company box
  page.drawRectangle({ x: MARGIN, y: y - boxH + 12, width: halfW, height: boxH, color: lightBg, borderColor, borderWidth: 0.5 })
  let boxY = y
  drawText(page, 'FORNITORE / CONSULENTE', MARGIN + 10, boxY, helveticaBold, 7.5, primaryRgb)
  boxY -= 14
  drawText(page, data.company.ragioneSociale, MARGIN + 10, boxY, helveticaBold, 9.5, darkText)
  boxY -= 13
  drawText(page, `P.IVA: ${data.company.partitaIva}`, MARGIN + 10, boxY, helvetica, 8, grayText)
  boxY -= 11
  if (data.company.codiceFiscale) {
    drawText(page, `C.F.: ${data.company.codiceFiscale}`, MARGIN + 10, boxY, helvetica, 8, grayText)
    boxY -= 11
  }
  drawText(page, `${data.company.indirizzo}, ${data.company.cap} ${data.company.citta} (${data.company.provincia})`, MARGIN + 10, boxY, helvetica, 8, grayText)
  boxY -= 11
  if (data.company.pec) drawText(page, `PEC: ${data.company.pec}`, MARGIN + 10, boxY, helvetica, 8, grayText)

  // Client box
  const cBoxX = MARGIN + halfW + 15
  page.drawRectangle({ x: cBoxX, y: y - boxH + 12, width: halfW, height: boxH, color: lightBg, borderColor, borderWidth: 0.5 })
  boxY = y
  drawText(page, 'CLIENTE / COMMITTENTE', cBoxX + 10, boxY, helveticaBold, 7.5, primaryRgb)
  boxY -= 14
  drawText(page, data.client.companyName, cBoxX + 10, boxY, helveticaBold, 9.5, darkText)
  boxY -= 13
  if (data.client.legalRepresentative) {
    drawText(page, `Leg. Rapp.: ${data.client.legalRepresentative}`, cBoxX + 10, boxY, helvetica, 8, grayText)
    boxY -= 11
  }
  if (data.client.vatNumber) {
    drawText(page, `P.IVA: ${data.client.vatNumber}`, cBoxX + 10, boxY, helvetica, 8, grayText)
    boxY -= 11
  }
  if (data.client.fiscalCode) {
    drawText(page, `C.F.: ${data.client.fiscalCode}`, cBoxX + 10, boxY, helvetica, 8, grayText)
    boxY -= 11
  }
  if (data.client.address) {
    const addrLines = wrapText(data.client.address, helvetica, 8, halfW - 20)
    for (const line of addrLines) {
      drawText(page, line, cBoxX + 10, boxY, helvetica, 8, grayText)
      boxY -= 11
    }
  }
  if (data.client.pec) drawText(page, `PEC: ${data.client.pec}`, cBoxX + 10, boxY, helvetica, 8, grayText)

  y = y - boxH - 15

  // ═══ CONTRACT CLAUSES ════════════════════════════════════

  const { clauses } = data.template

  for (let ci = 0; ci < clauses.length; ci++) {
    const clause = clauses[ci]
    const articleNum = ci + 1

    // Article title
    checkPageBreak(40)
    const titleText = `Art. ${articleNum} - ${clause.title}`
    drawText(page, titleText, MARGIN, y, helveticaBold, 10, primaryRgb)
    y -= 5
    // Underline
    const titleW = helveticaBold.widthOfTextAtSize(titleText, 10)
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + titleW, y }, thickness: 0.8, color: primaryRgb })
    y -= 14

    // Clause content - split by paragraphs
    const content = replaceFields(clause.content)
    const paragraphs = content.split('\n')

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim()
      if (!trimmed) {
        y -= 6
        continue
      }

      // Detect list items (starting with -, a), 1., etc.)
      const isListItem = /^[-•]/.test(trimmed) || /^[a-z]\)/.test(trimmed) || /^\d+[\.\)]/.test(trimmed)
      const indent = isListItem ? MARGIN + 15 : MARGIN
      const maxW = isListItem ? CONTENT_W - 15 : CONTENT_W
      const fontSize = 8.5

      const lines = wrapText(trimmed, helvetica, fontSize, maxW)
      for (const line of lines) {
        checkPageBreak(16)
        drawText(page, line, indent, y, helvetica, fontSize, darkText)
        y -= 12
      }
      y -= 3
    }

    y -= 8
  }

  // ═══ SIGNATURE SECTION ═══════════════════════════════════

  checkPageBreak(160)

  y -= 10
  page.drawLine({ start: { x: MARGIN, y: y + 5 }, end: { x: PAGE_W - MARGIN, y: y + 5 }, thickness: 0.5, color: borderColor })
  y -= 10

  drawText(page, 'FIRME DELLE PARTI', MARGIN, y, helveticaBold, 10, primaryRgb)
  y -= 5
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + helveticaBold.widthOfTextAtSize('FIRME DELLE PARTI', 10), y }, thickness: 0.8, color: primaryRgb })
  y -= 20

  drawText(page, `Luogo e data: ${data.city}, ${data.date}`, MARGIN, y, helvetica, 9, darkText)
  y -= 25

  // Two signature columns
  const sigHalfW = (CONTENT_W - 40) / 2

  // Company signature
  drawText(page, 'Per il Fornitore', MARGIN, y, helveticaBold, 9, primaryRgb)
  drawText(page, data.company.ragioneSociale, MARGIN, y - 14, helvetica, 8.5, darkText)
  y -= 50
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + sigHalfW, y }, thickness: 0.5, color: borderColor })
  drawText(page, 'Firma e timbro', MARGIN, y - 12, helveticaOblique, 7, grayText)

  // Client signature
  const sigRightX = MARGIN + sigHalfW + 40
  drawText(page, 'Per il Cliente', sigRightX, y + 50, helveticaBold, 9, primaryRgb)
  drawText(page, data.client.companyName, sigRightX, y + 36, helvetica, 8.5, darkText)
  if (data.client.legalRepresentative) {
    drawText(page, data.client.legalRepresentative, sigRightX, y + 24, helvetica, 8, grayText)
  }
  page.drawLine({ start: { x: sigRightX, y }, end: { x: sigRightX + sigHalfW, y }, thickness: 0.5, color: borderColor })
  drawText(page, 'Firma e timbro', sigRightX, y - 12, helveticaOblique, 7, grayText)

  y -= 35

  // Specific approval clause (ex art. 1341-1342 c.c.)
  checkPageBreak(80)

  drawText(page, 'APPROVAZIONE SPECIFICA (artt. 1341-1342 c.c.)', MARGIN, y, helveticaBold, 8.5, primaryRgb)
  y -= 14

  const approvalText = 'Ai sensi e per gli effetti degli articoli 1341 e 1342 del Codice Civile, il Cliente dichiara di approvare specificamente le seguenti clausole: Limitazione di responsabilita, Durata e Recesso, Foro Competente.'
  const approvalLines = wrapText(approvalText, helveticaOblique, 8, CONTENT_W)
  for (const line of approvalLines) {
    checkPageBreak(16)
    drawText(page, line, MARGIN, y, helveticaOblique, 8, darkText)
    y -= 11
  }

  y -= 25

  // Client signature for specific approval
  drawText(page, 'Il Cliente (per approvazione specifica)', MARGIN, y, helveticaBold, 8, primaryRgb)
  y -= 35
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + sigHalfW, y }, thickness: 0.5, color: borderColor })
  drawText(page, 'Firma', MARGIN, y - 12, helveticaOblique, 7, grayText)

  // ═══ FOOTER on all pages ═══════════════════════════════════

  const pages = doc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    p.drawLine({ start: { x: MARGIN, y: FOOTER_H - 10 }, end: { x: PAGE_W - MARGIN, y: FOOTER_H - 10 }, thickness: 0.5, color: borderColor })

    const footerLine1 = `${data.company.ragioneSociale} - ${data.company.indirizzo}, ${data.company.cap} ${data.company.citta} (${data.company.provincia})`
    drawText(p, footerLine1, MARGIN, FOOTER_H - 23, helvetica, 6.5, grayText)

    const footerParts: string[] = [`P.IVA: ${data.company.partitaIva}`]
    if (data.company.pec) footerParts.push(`PEC: ${data.company.pec}`)
    if (data.company.iban) footerParts.push(`IBAN: ${data.company.iban}`)
    drawText(p, footerParts.join('  |  '), MARGIN, FOOTER_H - 34, helvetica, 6.5, grayText)

    const pageText = `Pagina ${i + 1} di ${pages.length} - ${data.contractNumber}`
    const pageTextW = helvetica.widthOfTextAtSize(pageText, 7)
    drawText(p, pageText, PAGE_W - MARGIN - pageTextW, FOOTER_H - 23, helvetica, 7, grayText)
  }

  return doc.save()
}
