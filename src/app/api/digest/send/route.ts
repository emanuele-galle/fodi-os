import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendViaSMTP } from '@/lib/email'
import { escapeHtml } from '@/lib/email-templates'
import { handleApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || brand.siteUrl
const LOGO_URL = `${SITE_URL}/logo-light.png`

const PRIORITY = {
  URGENT: { label: 'Urgente', dot: '#EF4444' },
  HIGH: { label: 'Alta', dot: '#F97316' },
  MEDIUM: { label: 'Media', dot: '#EAB308' },
  LOW: { label: 'Bassa', dot: '#22C55E' },
} as const

const STATUS_LABEL: Record<string, string> = {
  TODO: 'Da fare', IN_PROGRESS: 'In corso', IN_REVIEW: 'In revisione', DONE: 'Completata',
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtShort(d: Date) {
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
const esc = escapeHtml
function cut(t: string, n: number) { return t.length <= n ? t : t.slice(0, n - 1) + '\u2026' }
function initials(f: string, l: string) { return (f.charAt(0) + l.charAt(0)).toUpperCase() }

function daysLate(d: Date | null): string {
  if (!d) return ''
  const diff = Math.floor((Date.now() - d.getTime()) / 864e5)
  return diff <= 0 ? '' : diff === 1 ? '1g di ritardo' : `${diff}g di ritardo`
}

interface Task {
  id: string; title: string; priority: string; status: string
  dueDate: Date | null; project: { name: string } | null
}
interface Comment {
  content: string; createdAt: Date
  author: { firstName: string; lastName: string }
  task: { id: string; title: string } | null
}
interface Data {
  overdue: Task[]; dueToday: Task[]; dueTomorrow: Task[]
  completedYesterday: Task[]; recentComments: Comment[]
}

/* ════════════════════════════════════════════════════════════════
   HTML EMAIL BUILDER — Design: clean, minimal, high whitespace
   Inspired by Linear, Superhuman, Resend digest emails
   ════════════════════════════════════════════════════════════════ */

function taskRow(t: Task, showLate = false): string {
  const p = PRIORITY[t.priority as keyof typeof PRIORITY] || PRIORITY.MEDIUM
  const url = `${SITE_URL}/tasks?taskId=${t.id}`
  const proj = t.project?.name || ''
  const late = showLate ? daysLate(t.dueDate) : ''
  const due = t.dueDate ? fmtShort(new Date(t.dueDate)) : ''

  return `
<tr>
  <td style="padding:0 0 1px;">
    <a href="${url}" style="display:block;text-decoration:none;padding:14px 20px;background:#fff;border:1px solid #EAECF0;border-radius:12px;margin-bottom:6px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="10" valign="top" style="padding-top:5px;padding-right:14px;">
          <div style="width:10px;height:10px;border-radius:50%;background:${p.dot};"></div>
        </td>
        <td>
          <span style="font-size:14px;font-weight:600;color:#111827;line-height:1.4;display:block;">${esc(cut(t.title, 60))}</span>
          <span style="font-size:12px;color:#6B7280;line-height:1;margin-top:6px;display:block;">
            ${proj ? `<span style="color:#6366F1;font-weight:600;">${esc(cut(proj, 20))}</span><span style="color:#D1D5DB;padding:0 6px;">&#183;</span>` : ''}${STATUS_LABEL[t.status] || t.status}${due ? `<span style="color:#D1D5DB;padding:0 6px;">&#183;</span>${due}` : ''}${late ? `<span style="color:#D1D5DB;padding:0 6px;">&#183;</span><span style="color:#EF4444;font-weight:600;">${late}</span>` : ''}
          </span>
        </td>
        <td width="24" style="text-align:right;vertical-align:middle;">
          <span style="font-size:16px;color:#D1D5DB;">&#8250;</span>
        </td>
      </tr></table>
    </a>
  </td>
</tr>`
}

function section(title: string, count: number, accent: string, rows: string): string {
  return `
<tr><td style="padding:32px 0 0;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="padding-bottom:14px;">
      <span style="font-size:13px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:1.2px;">${esc(title)}</span>
      <span style="display:inline-block;margin-left:8px;width:22px;height:22px;line-height:22px;text-align:center;font-size:11px;font-weight:700;color:${accent};background:${accent}12;border-radius:7px;">${count}</span>
    </td>
  </tr></table>
  <table width="100%" cellpadding="0" cellspacing="0">
    ${rows}
  </table>
</td></tr>`
}

function commentRow(c: Comment): string {
  const name = `${c.author.firstName} ${c.author.lastName}`
  const ini = initials(c.author.firstName, c.author.lastName)
  const taskTitle = c.task ? esc(cut(c.task.title, 35)) : 'Task'
  const url = c.task ? `${SITE_URL}/tasks?taskId=${c.task.id}` : '#'
  const text = esc(cut(c.content.replace(/\n/g, ' '), 120))
  const time = new Date(c.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  return `
<tr>
  <td style="padding:0 0 1px;">
    <div style="padding:14px 20px;background:#fff;border:1px solid #EAECF0;border-radius:12px;margin-bottom:6px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="40" valign="top" style="padding-right:12px;">
          <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#6366F1,#A78BFA);text-align:center;line-height:34px;font-size:12px;font-weight:700;color:#fff;">${ini}</div>
        </td>
        <td>
          <span style="font-size:13px;color:#111827;font-weight:600;">${esc(name)}</span>
          <span style="font-size:12px;color:#9CA3AF;"> su </span>
          <a href="${url}" style="font-size:12px;color:#6366F1;text-decoration:none;font-weight:600;">${taskTitle}</a>
          <span style="font-size:11px;color:#D1D5DB;float:right;">${time}</span>
          <p style="margin:8px 0 0;font-size:13px;color:#4B5563;line-height:1.55;padding:10px 14px;background:#F9FAFB;border-radius:8px;border:1px solid #F3F4F6;">
            &ldquo;${text}&rdquo;
          </p>
        </td>
      </tr></table>
    </div>
  </td>
</tr>`
}

function buildEmail(firstName: string, data: Data): string {
  const today = fmtDate(new Date())
  const { overdue, dueToday, dueTomorrow, completedYesterday, recentComments } = data

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'

  // Dynamic subtitle
  let subtitle = 'Ecco cosa ti aspetta oggi.'
  if (overdue.length > 0) subtitle = `Hai ${overdue.length} task in ritardo e ${dueToday.length} in scadenza oggi.`
  else if (dueToday.length > 0) subtitle = `${dueToday.length} task in scadenza oggi. Buon lavoro!`
  else if (completedYesterday.length > 0) subtitle = `Complimenti! Ieri hai completato ${completedYesterday.length} task.`

  // Build sections only if data exists
  const sections: string[] = []
  if (overdue.length > 0)
    sections.push(section('In ritardo', overdue.length, '#EF4444', overdue.map(t => taskRow(t, true)).join('')))
  if (dueToday.length > 0)
    sections.push(section('Scadenza oggi', dueToday.length, '#F97316', dueToday.map(t => taskRow(t)).join('')))
  if (dueTomorrow.length > 0)
    sections.push(section('Scadenza domani', dueTomorrow.length, '#3B82F6', dueTomorrow.map(t => taskRow(t)).join('')))
  if (completedYesterday.length > 0)
    sections.push(section('Completate ieri', completedYesterday.length, '#10B981', completedYesterday.map(t => taskRow(t)).join('')))
  if (recentComments.length > 0)
    sections.push(section('Commenti recenti', recentComments.length, '#8B5CF6', recentComments.map(commentRow).join('')))

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Riepilogo — ${brand.name}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
*{box-sizing:border-box}
body,table,td{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
body{margin:0;padding:0;background:#F3F4F6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
a{text-decoration:none}
@media(max-width:600px){
  .outer{padding:12px!important}
  .inner{padding:28px 20px!important}
  .stat-val{font-size:22px!important}
  .stat-box{padding:14px 8px!important}
}
</style>
</head>
<body>
<!-- Preview text -->
<div style="display:none;max-height:0;overflow:hidden">${esc(subtitle)}&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;">
<tr><td class="outer" style="padding:40px 16px;" align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <!-- LOGO -->
  <tr><td style="padding:0 0 32px;text-align:center;">
    <img src="${LOGO_URL}" alt="${brand.name}" width="160" height="26" style="display:inline-block;" />
  </td></tr>

  <!-- MAIN CARD -->
  <tr><td style="background:#FFFFFF;border-radius:16px;border:1px solid #E5E7EB;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0">

      <!-- Header -->
      <tr><td class="inner" style="padding:36px 32px 28px;">
        <p style="margin:0 0 2px;font-size:14px;color:#9CA3AF;font-weight:500;">${today}</p>
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px;line-height:1.2;">${greeting}, ${esc(firstName)}</h1>
        <p style="margin:0;font-size:15px;color:#6B7280;line-height:1.5;">${esc(subtitle)}</p>
      </td></tr>

      <!-- STATS -->
      <tr><td style="padding:0 32px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;overflow:hidden;border:1px solid #F3F4F6;">
          <tr>
            <td class="stat-box" width="33%" style="background:#FFF7ED;padding:20px 12px;text-align:center;${overdue.length > 0 ? 'border-right:1px solid #FED7AA;' : 'border-right:1px solid #F3F4F6;'}">
              <div class="stat-val" style="font-size:28px;font-weight:800;color:#EA580C;line-height:1;">${dueToday.length}</div>
              <div style="font-size:10px;font-weight:700;color:#EA580C;margin-top:4px;text-transform:uppercase;letter-spacing:0.8px;opacity:.75;">Oggi</div>
            </td>
            <td class="stat-box" width="33%" style="background:${overdue.length > 0 ? '#FEF2F2' : '#F9FAFB'};padding:20px 12px;text-align:center;border-right:1px solid #F3F4F6;">
              <div class="stat-val" style="font-size:28px;font-weight:800;color:${overdue.length > 0 ? '#DC2626' : '#9CA3AF'};line-height:1;">${overdue.length}</div>
              <div style="font-size:10px;font-weight:700;color:${overdue.length > 0 ? '#DC2626' : '#9CA3AF'};margin-top:4px;text-transform:uppercase;letter-spacing:0.8px;opacity:.75;">Ritardo</div>
            </td>
            <td class="stat-box" width="34%" style="background:#F0FDF4;padding:20px 12px;text-align:center;">
              <div class="stat-val" style="font-size:28px;font-weight:800;color:#16A34A;line-height:1;">${completedYesterday.length}</div>
              <div style="font-size:10px;font-weight:700;color:#16A34A;margin-top:4px;text-transform:uppercase;letter-spacing:0.8px;opacity:.75;">Completate</div>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- DIVIDER -->
      <tr><td style="padding:16px 32px 0;">
        <div style="height:1px;background:#F3F4F6;"></div>
      </td></tr>

      <!-- SECTIONS -->
      <tr><td style="padding:0 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${sections.join('')}
        </table>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:36px 32px 12px;text-align:center;">
        <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#111827;color:#FFFFFF;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;">Apri Dashboard</a>
      </td></tr>

      <!-- Tip -->
      <tr><td style="padding:8px 32px 36px;text-align:center;">
        <span style="font-size:12px;color:#D1D5DB;">Premi rispondi per parlare direttamente con il team</span>
      </td></tr>

    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:28px 0;text-align:center;">
    <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;">
      <a href="${SITE_URL}/settings" style="color:#6B7280;text-decoration:underline;">Disattiva email</a>
      <span style="color:#D1D5DB;padding:0 8px;">&#183;</span>
      <a href="${SITE_URL}/dashboard" style="color:#6B7280;text-decoration:underline;">Dashboard</a>
    </p>
    <p style="margin:0;font-size:11px;color:#D1D5DB;">${brand.email.footerText} &middot; Sistema Gestionale</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function POST(req: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET
  if (!CRON_SECRET) {
    logger.error('[digest] CRON_SECRET env var not configured')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Support both Authorization: Bearer and legacy x-digest-secret header
  const authHeader = req.headers.get('authorization')
  const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const legacySecret = req.headers.get('x-digest-secret')
  const secret = bearerSecret || legacySecret
  if (!secret || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 864e5)
  const tomorrowEnd = new Date(todayStart.getTime() + 2 * 864e5)
  const yesterdayStart = new Date(todayStart.getTime() - 864e5)
  const last24h = new Date(now.getTime() - 864e5)

  const isTest = req.nextUrl.searchParams.get('test') === 'true'
  const users = await prisma.user.findMany({
    where: {
      isActive: true, dailyDigest: true, role: { not: 'CLIENT' },
      ...(isTest && process.env.DIGEST_TEST_EMAIL && { email: process.env.DIGEST_TEST_EMAIL }),
    },
    select: { id: true, firstName: true, email: true },
  })

  const sel = {
    id: true, title: true, priority: true, status: true,
    dueDate: true, project: { select: { name: true } },
  } as const

  let sent = 0, skipped = 0, errors = 0

  for (const u of users) {
    try {
      const userOr = [
        { assigneeId: u.id },
        { assignments: { some: { userId: u.id } } },
      ] as const
      const activeStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] as const

      const [overdue, dueToday, dueTomorrow, completedYesterday, recentComments] = await Promise.all([
        prisma.task.findMany({
          where: { status: { in: [...activeStatuses] }, dueDate: { lt: todayStart }, OR: [...userOr] },
          select: sel, orderBy: { dueDate: 'asc' }, take: 5,
        }),
        prisma.task.findMany({
          where: { status: { in: [...activeStatuses] }, dueDate: { gte: todayStart, lt: todayEnd }, OR: [...userOr] },
          select: sel, orderBy: { priority: 'asc' },
        }),
        prisma.task.findMany({
          where: { status: { in: [...activeStatuses] }, dueDate: { gte: todayEnd, lt: tomorrowEnd }, OR: [...userOr] },
          select: sel, orderBy: { priority: 'asc' },
        }),
        prisma.task.findMany({
          where: { completedAt: { gte: yesterdayStart, lt: todayStart }, OR: [...userOr] },
          select: sel, orderBy: { completedAt: 'desc' }, take: 10,
        }),
        prisma.comment.findMany({
          where: {
            createdAt: { gte: last24h }, authorId: { not: u.id },
            task: { OR: [{ assigneeId: u.id }, { creatorId: u.id }, { assignments: { some: { userId: u.id } } }] },
          },
          select: { content: true, createdAt: true, author: { select: { firstName: true, lastName: true } }, task: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' }, take: 10,
        }),
      ])

      if (!overdue.length && !dueToday.length && !dueTomorrow.length && !completedYesterday.length && !recentComments.length) { skipped++; continue }

      const html = buildEmail(u.firstName, { overdue, dueToday, dueTomorrow, completedYesterday, recentComments })
      const ok = await sendViaSMTP(u.email, `Riepilogo del ${fmtDate(now)} — ${brand.name}`, html)
      ok ? sent++ : errors++
      await sleep(500)
    } catch (err) {
      logger.error(`[digest] Error for user ${u.id}`, { error: err instanceof Error ? err.message : String(err) })
      errors++
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors, totalUsers: users.length })
  } catch (e) {
    return handleApiError(e)
  }
}
