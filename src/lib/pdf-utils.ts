import { rgb, PDFPage, PDFFont } from 'pdf-lib'
import type { Color } from 'pdf-lib'

// ─── Color Helpers ─────────────────────────────────────────

export function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.substring(0, 2), 16) / 255,
    g: parseInt(clean.substring(2, 4), 16) / 255,
    b: parseInt(clean.substring(4, 6), 16) / 255,
  }
}

export function lightenColor(hex: string, amount: number) {
  const c = hexToRgb(hex)
  return rgb(
    Math.min(1, c.r + (1 - c.r) * amount),
    Math.min(1, c.g + (1 - c.g) * amount),
    Math.min(1, c.b + (1 - c.b) * amount),
  )
}

// ─── Drawing Helpers ───────────────────────────────────────

export function drawText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color: Color = rgb(0.1, 0.1, 0.1)) {
  page.drawText(text, { x, y, size, font, color })
}

export function drawTextRight(page: PDFPage, text: string, rightX: number, y: number, font: PDFFont, size: number, color: Color = rgb(0.1, 0.1, 0.1)) {
  const w = font.widthOfTextAtSize(text, size)
  drawText(page, text, rightX - w, y, font, size, color)
}

export function drawTextCenter(page: PDFPage, text: string, y: number, font: PDFFont, size: number, pageWidth: number, color: Color = rgb(0.1, 0.1, 0.1)) {
  const w = font.widthOfTextAtSize(text, size)
  drawText(page, text, (pageWidth - w) / 2, y, font, size, color)
}

// ─── Text Helpers ──────────────────────────────────────────

export function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let t = text
  while (t.length > 1 && font.widthOfTextAtSize(t + '\u2026', size) > maxWidth) {
    t = t.slice(0, -1)
  }
  return t + '\u2026'
}

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

// ─── Formatting Helpers ────────────────────────────────────

export function formatEur(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) || 0 : val
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(num)
}

export function formatHoursShort(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  if (h === 0) return `${m}min`
  return `${h}h ${m}min`
}

export function formatMinsHuman(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}min`)
  return parts.length ? parts.join(' ') : '0min'
}
