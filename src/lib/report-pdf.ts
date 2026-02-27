import { brand } from '@/lib/branding'
import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont, PDFImage } from 'pdf-lib'
import { hexToRgb, lightenColor, drawText as draw, drawTextRight as drawRight, truncate, wrapText, formatEur, formatHoursShort, formatMinsHuman } from '@/lib/pdf-utils'

// ─── Types ──────────────────────────────────────────────────

export interface ReportTimeEntry {
  description?: string | null
  taskTitle?: string | null
  isSubtask?: boolean
  parentTitle?: string | null
  projectName?: string | null
  activityType?: string | null
  startTime?: string | null
  endTime?: string | null
  hours: number
  billable: boolean
  hourlyRate?: number | null
}

export interface ReportTask {
  title: string
  priority: string
  status: string
  dueDate?: string | null
  projectName?: string | null
  estimatedHours?: number | null
  tags?: string[]
}

export interface ReportWorkSession {
  clockIn: string
  clockOut?: string | null
  durationMins?: number | null
  notes?: string | null
}

export interface ReportProjectBreakdown {
  projectName: string
  totalHours: number
  billableHours: number
  nonBillableHours: number
  entryCount: number
  percentage: number
}

export interface ReportActivity {
  action: string
  entityType: string
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface DailyReportData {
  userName: string
  userEmail: string
  userRole: string
  date: string
  generatedAt: string
  kpi: {
    hoursLogged: number
    billableHours: number
    nonBillableHours: number
    billablePercentage: number
    billableValue: number
    tasksCompleted: number
    tasksCreated: number
    activeTasks: number
    activityCount: number
    workSessionMinutes: number
  }
  timeEntries: ReportTimeEntry[]
  workSessions: ReportWorkSession[]
  projectBreakdown: ReportProjectBreakdown[]
  completedTasks: ReportTask[]
  activeTasks: ReportTask[]
  activities: ReportActivity[]
}

export interface ReportCompanyInfo {
  ragioneSociale: string
  partitaIva: string
  indirizzo?: string | null
  cap?: string | null
  citta?: string | null
  provincia?: string | null
  telefono?: string | null
  email?: string | null
  siteUrl?: string | null
  logoBytes?: Uint8Array | null
  logoMimeType?: string
  primaryColor?: string
  secondaryColor?: string
}

// ─── Constants ──────────────────────────────────────────────

const PAGE_W = 841.89
const PAGE_H = 595.28
const MARGIN = 40
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_H = 35

// ─── Helpers ────────────────────────────────────────────────

function formatWeekdayDateIT(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const result = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return result.charAt(0).toUpperCase() + result.slice(1)
}

// ─── Activity Labels ────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creato', UPDATE: 'Aggiornato', DELETE: 'Eliminato',
  COMPLETE: 'Completato', ASSIGN: 'Assegnato', COMMENT: 'Commentato',
  ARCHIVE: 'Archiviato', RESTORE: 'Ripristinato', UPLOAD: 'Caricato',
  DOWNLOAD: 'Scaricato', SEND: 'Inviato', APPROVE: 'Approvato',
  REJECT: 'Rifiutato', START: 'Iniziato', STOP: 'Fermato',
  LOGIN: 'Accesso', LOGOUT: 'Disconnessione',
  TIMER_STOP: 'Timer fermato', AUTO_TIME_LOG: 'Tempo registrato',
}

const ENTITY_LABELS: Record<string, string> = {
  TASK: 'task', TIME_ENTRY: 'tempo', TimeEntry: 'tempo',
  PROJECT: 'progetto', DOCUMENT: 'documento', INVOICE: 'fattura',
  QUOTE: 'preventivo', CLIENT: 'cliente', USER: 'utente',
  COMMENT: 'commento', FILE: 'file', REPORT: 'report',
  ACTIVITY: 'attivita', NOTE: 'nota', LEAD: 'lead',
  CONTACT: 'contatto', AUTH: '', EXPENSE: 'spesa',
  SUBSCRIPTION: 'abbonamento',
}

const HIDDEN_ACTIVITIES = new Set(['LOGIN_IP_VERIFIED', 'LOGIN_OTP_SENT'])

function formatActivityDetail(activity: ReportActivity): string {
  const meta = activity.metadata
  if (!meta) return ''
  if (meta.title && typeof meta.title === 'string') {
    const proj = meta.projectName ? ` (${meta.projectName})` : ''
    return `"${meta.title}"${proj}`
  }
  if (meta.taskTitle && typeof meta.taskTitle === 'string') {
    const hrs = typeof meta.hours === 'number' ? ` — ${meta.hours.toFixed(2)} ore` : ''
    return `"${meta.taskTitle}"${hrs}`
  }
  if (meta.companyName && typeof meta.companyName === 'string') return `"${meta.companyName}"`
  if (meta.name && typeof meta.name === 'string') return `"${meta.name}"`
  if (meta.amount && typeof meta.amount === 'number') {
    const parts: string[] = []
    if (meta.category) parts.push(String(meta.category))
    if (meta.provider) parts.push(String(meta.provider))
    parts.push(`${meta.amount.toFixed(2)} EUR`)
    return parts.join(' - ')
  }
  if (meta.changedFields && typeof meta.changedFields === 'string') {
    const fieldLabels: Record<string, string> = {
      title: 'titolo', description: 'descrizione', status: 'stato',
      priority: 'priorita', dueDate: 'scadenza', assigneeId: 'assegnazione',
      completedAt: 'completamento', boardColumn: 'colonna',
      timerStartedAt: 'timer', timerUserId: 'timer',
    }
    const fields = meta.changedFields.split(',')
    const meaningful = fields
      .map(f => fieldLabels[f.trim()])
      .filter((v, i, a) => v && a.indexOf(v) === i)
    if (meaningful.length > 0) return `(${meaningful.join(', ')})`
  }
  return ''
}

// ─── Priority / Status badge colors ────────────────────────

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  URGENT: { bg: '#DC2626', text: '#FFFFFF' },
  HIGH: { bg: '#F97316', text: '#FFFFFF' },
  MEDIUM: { bg: '#3B82F6', text: '#FFFFFF' },
  LOW: { bg: '#9CA3AF', text: '#FFFFFF' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  TODO: { bg: '#9CA3AF', text: '#FFFFFF', label: 'DA FARE' },
  IN_PROGRESS: { bg: '#3B82F6', text: '#FFFFFF', label: 'IN CORSO' },
  IN_REVIEW: { bg: '#F59E0B', text: '#FFFFFF', label: 'IN REVISIONE' },
}

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'URGENTE', HIGH: 'ALTA', MEDIUM: 'MEDIA', LOW: 'BASSA',
}

// ─── Main Generator ─────────────────────────────────────────

export async function generateReportPdf(data: DailyReportData, company?: ReportCompanyInfo): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const primaryHex = company?.primaryColor || '#3B82F6'
  const secondaryHex = company?.secondaryColor || '#1E293B'
  const primary = hexToRgb(primaryHex)
  const secondary = hexToRgb(secondaryHex)
  const primaryRgb = rgb(primary.r, primary.g, primary.b)
  const secondaryRgb = rgb(secondary.r, secondary.g, secondary.b)
  const white = rgb(1, 1, 1)
  const darkText = rgb(0.1, 0.1, 0.1)
  const grayText = rgb(0.4, 0.4, 0.4)
  const lightGray = rgb(0.6, 0.6, 0.6)
  const borderColor = rgb(0.9, 0.9, 0.9)
  const primaryLightBg = lightenColor(primaryHex, 0.88)

  let logoImage: PDFImage | null = null
  if (company?.logoBytes) {
    try {
      logoImage = company.logoMimeType === 'image/png'
        ? await doc.embedPng(company.logoBytes)
        : await doc.embedJpg(company.logoBytes)
    } catch { /* continue without logo */ }
  }

  let page = doc.addPage([PAGE_W, PAGE_H])
  let y = PAGE_H

  const roleLabels: Record<string, string> = { ADMIN: 'Amministratore', DIR_COMMERCIALE: 'Dir. Commerciale', DIR_TECNICO: 'Dir. Tecnico', DIR_SUPPORT: 'Dir. Supporto', COMMERCIALE: 'Commerciale', PM: 'Project Manager', DEVELOPER: 'Sviluppatore', CONTENT: 'Contenuti', SUPPORT: 'Assistenza' }

  // ─── Layout constants ──────────────────────────────────────
  const HEADER_H = 40
  const COL_LEFT_W = 430
  const COL_GAP = 20
  const COL_SPLIT_X = MARGIN + COL_LEFT_W
  const RIGHT_X = COL_SPLIT_X + COL_GAP
  const RIGHT_W = PAGE_W - MARGIN - RIGHT_X
  const MAX_TASKS = 8

  // ─── Helper: Section Title (scoped to a column) ────────────
  function drawColSectionTitle(title: string, x: number, w: number, atY: number): number {
    draw(page, title, x, atY, bold, 8, primaryRgb)
    const lineY = atY - 3
    page.drawLine({ start: { x, y: lineY }, end: { x: x + w, y: lineY }, thickness: 0.6, color: primaryRgb })
    return lineY - 10
  }

  // ─── Helper: Slim Header ───────────────────────────────────
  function drawSlimHeader() {
    page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: secondaryRgb })

    let hx = MARGIN
    if (logoImage) {
      const logoMaxH = 28
      const aspect = logoImage.width / logoImage.height
      let lw = logoMaxH * aspect
      let lh = logoMaxH
      if (lw > 60) { lw = 60; lh = 60 / aspect }
      page.drawImage(logoImage, { x: MARGIN, y: PAGE_H - HEADER_H + (HEADER_H - lh) / 2, width: lw, height: lh })
      hx = MARGIN + lw + 10
    }
    draw(page, company?.ragioneSociale || brand.company, hx, PAGE_H - HEADER_H + 14, bold, 12, white)

    // Badge + date on right
    const badgeText = 'REPORT GIORNALIERO'
    const badgeW = bold.widthOfTextAtSize(badgeText, 8) + 14
    const badgeX = PAGE_W - MARGIN - badgeW
    page.drawRectangle({ x: badgeX, y: PAGE_H - HEADER_H + 14, width: badgeW, height: 18, color: primaryRgb })
    draw(page, badgeText, badgeX + 7, PAGE_H - HEADER_H + 19, bold, 8, white)

    const dateShort = new Date(data.date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    drawRight(page, dateShort, PAGE_W - MARGIN, PAGE_H - HEADER_H + 5, font, 7, rgb(0.75, 0.75, 0.75))
  }

  // ─── Helper: Priority Badge ───────────────────────────────
  function drawPriorityBadge(x: number, bY: number, priority: string): number {
    const colors = PRIORITY_COLORS[priority] || PRIORITY_COLORS.MEDIUM
    const label = PRIORITY_LABELS[priority] || priority
    const badgeW = bold.widthOfTextAtSize(label, 5.5) + 7
    const bgC = hexToRgb(colors.bg)
    page.drawRectangle({ x, y: bY - 1.5, width: badgeW, height: 9, color: rgb(bgC.r, bgC.g, bgC.b) })
    draw(page, label, x + 3.5, bY, bold, 5.5, white)
    return badgeW + 3
  }

  // ─── Helper: Status Badge ─────────────────────────────────
  function drawStatusBadge(x: number, bY: number, status: string): number {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.TODO
    const label = colors.label
    const badgeW = bold.widthOfTextAtSize(label, 5.5) + 7
    const bgC = hexToRgb(colors.bg)
    page.drawRectangle({ x, y: bY - 1.5, width: badgeW, height: 9, color: rgb(bgC.r, bgC.g, bgC.b) })
    draw(page, label, x + 3.5, bY, bold, 5.5, white)
    return badgeW + 3
  }

  // ═══ PAGE 1: DASHBOARD ═════════════════════════════════════

  drawSlimHeader()
  y = PAGE_H - HEADER_H - 14

  // ─── Info dipendente (inline, no box) ──────────────────────
  const dateLabel = formatWeekdayDateIT(data.date)
  const roleTxt = roleLabels[data.userRole] || data.userRole

  // Row 1: Name · Role · Email
  draw(page, data.userName, MARGIN, y, bold, 9, darkText)
  const nameW = bold.widthOfTextAtSize(data.userName, 9)
  draw(page, ` · ${roleTxt} · ${data.userEmail}`, MARGIN + nameW, y, font, 9, grayText)
  y -= 13

  // Row 2: Full date · Session range
  let infoLine2 = dateLabel
  if (data.workSessions.length > 0) {
    const sorted = [...data.workSessions].sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())
    const firstIn = new Date(sorted[0].clockIn).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    const lastSession = sorted[sorted.length - 1]
    const lastOut = lastSession.clockOut
      ? new Date(lastSession.clockOut).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      : 'in corso'
    infoLine2 += ` · Sessione ${firstIn} - ${lastOut}`
  }
  draw(page, infoLine2, MARGIN, y, font, 8, lightGray)
  y -= 6

  // Separator line
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.4, color: borderColor })
  y -= 14

  // ─── KPI Cards (slim 40px, full width) ─────────────────────
  const cardGap = 10
  const cardW = (CONTENT_W - cardGap * 3) / 4
  const cardH = 40

  function drawSlimKpiCard(x: number, value: string, label: string, subtitle: string) {
    const maxValW = cardW - 16
    let valSize = 14
    while (valSize > 10 && bold.widthOfTextAtSize(value, valSize) > maxValW) valSize -= 1

    page.drawRectangle({ x, y: y - cardH, width: cardW, height: cardH, borderColor, borderWidth: 0.5 })
    page.drawRectangle({ x, y: y - cardH, width: 3, height: cardH, color: primaryRgb })
    draw(page, truncate(value, bold, valSize, maxValW), x + 10, y - 16, bold, valSize, darkText)
    draw(page, label, x + 10, y - 27, font, 7, grayText)
    if (subtitle) draw(page, truncate(subtitle, font, 6.5, maxValW), x + 10, y - 36, font, 6.5, lightGray)
  }

  // Card 1: Ore Lavorate
  const billableSub = data.kpi.billableHours > 0
    ? `di cui ${formatHoursShort(data.kpi.billableHours)} fatturabili`
    : 'nessuna ora fatturabile'
  drawSlimKpiCard(MARGIN, formatHoursShort(data.kpi.hoursLogged), 'ORE LAVORATE', billableSub)

  // Card 2: Task Completati
  drawSlimKpiCard(MARGIN + cardW + cardGap,
    String(data.kpi.tasksCompleted), 'TASK COMPLETATI',
    `${data.kpi.tasksCreated} creati, ${data.kpi.activeTasks} attivi`)

  // Card 3: Fatturabile — with stacked billable bar
  const hasRates = data.kpi.billableValue > 0
  const valueStr = hasRates ? formatEur(data.kpi.billableValue) : formatHoursShort(data.kpi.billableHours)
  const valueSub = hasRates
    ? `media ${formatEur(data.kpi.billableValue / Math.max(data.kpi.billableHours, 0.01))}/h`
    : 'nessuna tariffa impostata'
  const card3X = MARGIN + (cardW + cardGap) * 2
  drawSlimKpiCard(card3X, valueStr, hasRates ? 'VALORE FATTURABILE' : 'ORE FATTURABILI', valueSub)

  // Stacked bar for billable percentage
  if (data.kpi.hoursLogged > 0) {
    const barY = y - cardH + 3
    const barX = card3X + 10
    const barW = cardW - 20
    const barH = 4
    const billPct = data.kpi.billablePercentage / 100
    // Non-billable (light)
    page.drawRectangle({ x: barX, y: barY, width: barW, height: barH, color: primaryLightBg })
    // Billable (solid)
    if (billPct > 0) {
      page.drawRectangle({ x: barX, y: barY, width: Math.max(barW * billPct, 2), height: barH, color: primaryRgb })
    }
    // Percentage text centered above bar
    const pctText = `${Math.round(data.kpi.billablePercentage)}%`
    const pctW = font.widthOfTextAtSize(pctText, 5.5)
    draw(page, pctText, barX + (barW - pctW) / 2, barY + barH + 2, font, 5.5, grayText)
  }

  // Card 4: Sessione
  if (data.workSessions.length > 0 && data.kpi.workSessionMinutes > 0) {
    const sorted = [...data.workSessions].sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime())
    const firstIn = new Date(sorted[0].clockIn).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    const lastSession = sorted[sorted.length - 1]
    const lastOut = lastSession.clockOut
      ? new Date(lastSession.clockOut).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      : 'now'
    drawSlimKpiCard(MARGIN + (cardW + cardGap) * 3,
      `${firstIn} - ${lastOut}`, 'SESSIONE LAVORO',
      `durata ${formatMinsHuman(data.kpi.workSessionMinutes)}`)
  } else {
    drawSlimKpiCard(MARGIN + (cardW + cardGap) * 3, 'N/D', 'SESSIONE LAVORO', 'nessuna sessione')
  }

  y -= cardH + 10

  // ─── Visual separator after KPI ───────────────────────────
  const primaryFaded = lightenColor(primaryHex, 0.5)
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.6, color: primaryFaded })
  page.drawLine({ start: { x: MARGIN, y: y - 2 }, end: { x: PAGE_W - MARGIN, y: y - 2 }, thickness: 0.3, color: borderColor })
  y -= 12

  // ═══ TWO-COLUMN LAYOUT ═════════════════════════════════════
  let yL = y  // left column tracker
  let yR = y  // right column tracker

  // ─── LEFT COLUMN: Distribuzione Tempo ──────────────────────
  const PROJECT_DOT_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444']

  if (data.projectBreakdown.length > 0) {
    yL = drawColSectionTitle(
      `DISTRIBUZIONE TEMPO (${data.projectBreakdown.length} progett${data.projectBreakdown.length === 1 ? 'o' : 'i'})`,
      MARGIN, COL_LEFT_W, yL
    )

    const barMaxW = COL_LEFT_W - 200
    const maxHours = Math.max(...data.projectBreakdown.map(p => p.totalHours), 0.01)

    for (let pi = 0; pi < data.projectBreakdown.length; pi++) {
      const proj = data.projectBreakdown[pi]
      const dotColor = hexToRgb(PROJECT_DOT_COLORS[pi % PROJECT_DOT_COLORS.length])

      // Colored dot
      page.drawCircle({ x: MARGIN + 4, y: yL + 1, size: 3, color: rgb(dotColor.r, dotColor.g, dotColor.b) })

      const projLabel = truncate(proj.projectName, font, 7.5, 110)
      draw(page, projLabel, MARGIN + 12, yL, font, 7.5, darkText)

      const barX = MARGIN + 130
      const totalBarW = (proj.totalHours / maxHours) * barMaxW
      const billBarW = (proj.billableHours / maxHours) * barMaxW

      if (totalBarW > 0) {
        page.drawRectangle({ x: barX, y: yL - 5, width: Math.max(totalBarW, 2), height: 12, color: primaryLightBg })
      }
      if (billBarW > 0) {
        page.drawRectangle({ x: barX, y: yL - 5, width: Math.max(billBarW, 2), height: 12, color: primaryRgb })
      }

      const rightLabel = `${formatHoursShort(proj.totalHours)} (${Math.round(proj.percentage)}%)`
      draw(page, rightLabel, barX + barMaxW + 8, yL, font, 7, grayText)
      yL -= 16
    }

    // Legend row
    page.drawRectangle({ x: MARGIN + 130, y: yL, width: 8, height: 8, color: primaryRgb })
    draw(page, 'Fatturabile', MARGIN + 141, yL + 1, font, 6, grayText)
    page.drawRectangle({ x: MARGIN + 195, y: yL, width: 8, height: 8, color: primaryLightBg })
    draw(page, 'Non fatturabile', MARGIN + 206, yL + 1, font, 6, grayText)
    yL -= 12
  }

  // ─── LEFT COLUMN: Registro Tempo (tabella 5 colonne) ───────
  if (data.timeEntries.length > 0) {
    yL = drawColSectionTitle(
      `REGISTRO TEMPO (${data.timeEntries.length})`,
      MARGIN, COL_LEFT_W, yL
    )

    // 5 columns: Progetto, Attivita, Ore, Fatt., Valore
    const tCols = {
      progetto: { x: MARGIN, w: 110 },
      attivita: { x: MARGIN + 110, w: 190 },
      ore: { x: MARGIN + 300, w: 42 },
      fatt: { x: MARGIN + 342, w: 35 },
      valore: { x: MARGIN + 377, w: COL_LEFT_W - 377 },
    }

    // Table header
    const thH = 16
    page.drawRectangle({ x: MARGIN, y: yL - thH + 4, width: COL_LEFT_W, height: thH, color: secondaryRgb })
    for (const [, col] of Object.entries(tCols)) {
      const labels: Record<number, string> = { [tCols.progetto.x]: 'Progetto', [tCols.attivita.x]: 'Attivita', [tCols.ore.x]: 'Ore', [tCols.fatt.x]: 'Fatt.', [tCols.valore.x]: 'Valore' }
      draw(page, labels[col.x] || '', col.x + 3, yL - 6, bold, 6.5, white)
    }
    yL -= thH

    let totalValue = 0
    for (let i = 0; i < data.timeEntries.length; i++) {
      const entry = data.timeEntries[i]
      const rowH = 13

      if (i % 2 === 0) {
        page.drawRectangle({ x: MARGIN, y: yL - rowH + 3, width: COL_LEFT_W, height: rowH, color: rgb(0.98, 0.98, 0.99) })
      }
      page.drawLine({ start: { x: MARGIN, y: yL - rowH + 3 }, end: { x: MARGIN + COL_LEFT_W, y: yL - rowH + 3 }, thickness: 0.2, color: borderColor })

      draw(page, truncate(entry.projectName || '-', font, 6.5, tCols.progetto.w - 6), tCols.progetto.x + 3, yL - 2, font, 6.5, darkText)

      const desc = entry.taskTitle || entry.description || '-'
      draw(page, truncate(desc, font, 6.5, tCols.attivita.w - 6), tCols.attivita.x + 3, yL - 2, font, 6.5, darkText)

      draw(page, entry.hours.toFixed(2), tCols.ore.x + 3, yL - 2, font, 6.5, darkText)
      draw(page, entry.billable ? 'Si' : 'No', tCols.fatt.x + 3, yL - 2, font, 6.5, entry.billable ? primaryRgb : grayText)

      const entryValue = entry.billable && entry.hourlyRate ? entry.hours * entry.hourlyRate : 0
      totalValue += entryValue
      const valStr = entryValue > 0 ? formatEur(entryValue) : '-'
      draw(page, valStr, tCols.valore.x + 3, yL - 2, font, 6.5, entryValue > 0 ? darkText : grayText)

      yL -= rowH
    }

    // Total row
    const totH = 14
    page.drawRectangle({ x: MARGIN, y: yL - totH + 3, width: COL_LEFT_W, height: totH, color: primaryLightBg })
    draw(page, 'TOTALE', tCols.progetto.x + 3, yL - 4, bold, 7, darkText)
    draw(page, data.kpi.hoursLogged.toFixed(2), tCols.ore.x + 3, yL - 4, bold, 7, darkText)
    if (totalValue > 0) {
      draw(page, formatEur(totalValue), tCols.valore.x + 3, yL - 4, bold, 7, darkText)
    }
    yL -= totH + 6
  }

  // ─── RIGHT COLUMN: Task Completati ─────────────────────────
  if (data.completedTasks.length > 0) {
    yR = drawColSectionTitle(`TASK COMPLETATI (${data.completedTasks.length})`, RIGHT_X, RIGHT_W, yR)

    const showCompleted = data.completedTasks.slice(0, MAX_TASKS)
    for (const task of showCompleted) {
      let tx = RIGHT_X
      const bw = drawPriorityBadge(tx, yR, task.priority)
      tx += bw
      const maxTitleW = RIGHT_W - bw - 4
      draw(page, truncate(task.title, font, 7, maxTitleW), tx, yR + 1, font, 7, darkText)
      yR -= 13
    }
    if (data.completedTasks.length > MAX_TASKS) {
      draw(page, `... e altr${data.completedTasks.length - MAX_TASKS === 1 ? 'o' : 'i'} ${data.completedTasks.length - MAX_TASKS} task`, RIGHT_X, yR + 1, font, 6.5, lightGray)
      yR -= 13
    }
    yR -= 6
  }

  // ─── RIGHT COLUMN: Task In Corso ───────────────────────────
  if (data.activeTasks.length > 0) {
    yR = drawColSectionTitle(`TASK IN CORSO (${data.activeTasks.length})`, RIGHT_X, RIGHT_W, yR)

    const showActive = data.activeTasks.slice(0, MAX_TASKS)
    for (const task of showActive) {
      let tx = RIGHT_X
      const bw = drawStatusBadge(tx, yR, task.status)
      tx += bw
      const maxTitleW = RIGHT_W - bw - 4
      draw(page, truncate(task.title, font, 7, maxTitleW), tx, yR + 1, font, 7, darkText)
      yR -= 13
    }
    if (data.activeTasks.length > MAX_TASKS) {
      draw(page, `... e altr${data.activeTasks.length - MAX_TASKS === 1 ? 'o' : 'i'} ${data.activeTasks.length - MAX_TASKS} task`, RIGHT_X, yR + 1, font, 6.5, lightGray)
      yR -= 13
    }
    yR -= 6
  }

  // ─── RIGHT COLUMN: Box Riepilogo ──────────────────────────
  yR -= 4
  const boxW = RIGHT_W
  const boxRowH = 17
  const nonBillable = data.kpi.nonBillableHours
  const hasValue = data.kpi.billableValue > 0
  const rowCount = hasValue ? 4 : 3
  const boxH = boxRowH * (rowCount + 1)

  // Background tint for the entire box
  page.drawRectangle({ x: RIGHT_X, y: yR - boxH, width: boxW, height: boxH, color: primaryLightBg })
  page.drawRectangle({ x: RIGHT_X, y: yR - boxH, width: boxW, height: boxH, borderColor, borderWidth: 0.6 })

  // Header
  const hdrY = yR - boxRowH
  page.drawRectangle({ x: RIGHT_X, y: hdrY, width: boxW, height: boxRowH, color: secondaryRgb })
  draw(page, 'RIEPILOGO', RIGHT_X + 8, hdrY + 5, bold, 8, white)

  let rY = hdrY - boxRowH
  page.drawLine({ start: { x: RIGHT_X, y: rY }, end: { x: RIGHT_X + boxW, y: rY }, thickness: 0.3, color: borderColor })
  draw(page, 'Ore Totali', RIGHT_X + 8, rY + 5, font, 7.5, darkText)
  drawRight(page, formatHoursShort(data.kpi.hoursLogged), RIGHT_X + boxW - 8, rY + 5, bold, 8, darkText)

  rY -= boxRowH
  page.drawLine({ start: { x: RIGHT_X, y: rY }, end: { x: RIGHT_X + boxW, y: rY }, thickness: 0.3, color: borderColor })
  draw(page, 'Ore Fatturabili', RIGHT_X + 8, rY + 5, font, 7.5, darkText)
  drawRight(page, formatHoursShort(data.kpi.billableHours), RIGHT_X + boxW - 8, rY + 5, font, 8, darkText)

  rY -= boxRowH
  page.drawLine({ start: { x: RIGHT_X, y: rY }, end: { x: RIGHT_X + boxW, y: rY }, thickness: 0.3, color: borderColor })
  draw(page, 'Ore Non Fatturabili', RIGHT_X + 8, rY + 5, font, 7.5, darkText)
  drawRight(page, formatHoursShort(nonBillable), RIGHT_X + boxW - 8, rY + 5, font, 8, darkText)

  if (hasValue) {
    rY -= boxRowH
    page.drawRectangle({ x: RIGHT_X, y: rY, width: boxW, height: boxRowH, color: primaryRgb })
    draw(page, 'Valore Totale', RIGHT_X + 8, rY + 5, bold, 7.5, white)
    drawRight(page, formatEur(data.kpi.billableValue), RIGHT_X + boxW - 8, rY + 5, bold, 9, white)
  }

  // ═══ PAGE 2: LOG ATTIVITA (solo se presenti) ═══════════════

  const visibleActivities = data.activities.filter(a => !HIDDEN_ACTIVITIES.has(a.action))

  if (visibleActivities.length > 0) {
    page = doc.addPage([PAGE_W, PAGE_H])
    drawSlimHeader()
    y = PAGE_H - HEADER_H - 18

    draw(page, `LOG ATTIVITA (${visibleActivities.length})`, MARGIN, y, bold, 10, primaryRgb)
    y -= 4
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.8, color: primaryRgb })
    y -= 14

    const timelineX = MARGIN + 8
    const lineX = timelineX + 2
    const detailMaxW = CONTENT_W - 60
    const ROW_STEP = 17

    // Action → circle color
    const ACTION_CIRCLE_COLORS: Record<string, string> = {
      CREATE: '#22C55E', COMPLETE: '#15803D', APPROVE: '#15803D',
      UPDATE: '#3B82F6', ASSIGN: '#3B82F6', COMMENT: '#8B5CF6',
      DELETE: '#EF4444', REJECT: '#EF4444',
    }

    for (let i = 0; i < visibleActivities.length; i++) {
      const activity = visibleActivities[i]

      // Page break if needed
      if (y < FOOTER_H + MARGIN + 20) {
        page = doc.addPage([PAGE_W, PAGE_H])
        drawSlimHeader()
        y = PAGE_H - HEADER_H - 18
        draw(page, `LOG ATTIVITA (continua)`, MARGIN, y, bold, 10, primaryRgb)
        y -= 4
        page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.8, color: primaryRgb })
        y -= 14
      }

      // Continuous vertical line (to next entry)
      if (i < visibleActivities.length - 1) {
        page.drawLine({ start: { x: lineX, y: y - 4 }, end: { x: lineX, y: y - ROW_STEP }, thickness: 0.8, color: borderColor })
      }

      // Colored circle per action type
      const circleHex = ACTION_CIRCLE_COLORS[activity.action] || primaryHex
      const circleC = hexToRgb(circleHex)
      page.drawCircle({ x: lineX, y: y - 1, size: 3.5, color: rgb(circleC.r, circleC.g, circleC.b) })

      // Timestamp
      const ts = new Date(activity.createdAt)
      const timeStr = ts.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      draw(page, timeStr, timelineX + 10, y - 4, bold, 7, grayText)

      // Action + entity
      const actionLabel = ACTION_LABELS[activity.action] || activity.action.toLowerCase()
      const entityLabel = ENTITY_LABELS[activity.entityType] || activity.entityType.toLowerCase()
      const actionEntity = entityLabel ? `${actionLabel} ${entityLabel}` : actionLabel
      draw(page, actionEntity, timelineX + 42, y - 4, font, 7, darkText)

      // Detail
      const detail = formatActivityDetail(activity)
      if (detail) {
        const aeW = font.widthOfTextAtSize(actionEntity + '  ', 7)
        draw(page, truncate(detail, font, 7, detailMaxW - aeW), timelineX + 42 + aeW, y - 4, font, 7, grayText)
      }

      y -= ROW_STEP

      // Separator every 5 entries
      if ((i + 1) % 5 === 0 && i < visibleActivities.length - 1) {
        page.drawLine({ start: { x: MARGIN + 20, y: y + 4 }, end: { x: PAGE_W - MARGIN, y: y + 4 }, thickness: 0.3, color: borderColor })
      }
    }
  }

  // ═══ FOOTER (tutte le pagine) ══════════════════════════════

  const pages = doc.getPages()
  const generatedTs = new Date(data.generatedAt)
  const generatedLabel = `Generato il ${generatedTs.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} alle ${generatedTs.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    const footY = FOOTER_H - 10

    // Accent primary line (2px)
    p.drawLine({ start: { x: MARGIN, y: footY + 2 }, end: { x: PAGE_W - MARGIN, y: footY + 2 }, thickness: 2, color: primaryRgb, opacity: 0.4 })
    // Thin separator
    p.drawLine({ start: { x: MARGIN, y: footY }, end: { x: PAGE_W - MARGIN, y: footY }, thickness: 0.4, color: borderColor })

    // Company info
    const footParts: string[] = [company?.ragioneSociale || brand.company]
    if (company?.indirizzo && company?.cap && company?.citta && company?.provincia) {
      footParts.push(`${company.indirizzo}, ${company.cap} ${company.citta} (${company.provincia})`)
    }
    if (company?.partitaIva) footParts.push(`P.IVA: ${company.partitaIva}`)
    if (company?.email) footParts.push(company.email)
    draw(p, footParts.join('  ·  '), MARGIN, footY - 12, font, 6, grayText)

    // Timestamp + page number
    const pageText = `${generatedLabel}  ·  Pag ${i + 1} di ${pages.length}`
    drawRight(p, pageText, PAGE_W - MARGIN, footY - 12, font, 6, grayText)
  }

  return doc.save()
}
