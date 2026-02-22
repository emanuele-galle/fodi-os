import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/s3'
import { sendViaSMTP } from '@/lib/email'
import { generateReportPdf, type DailyReportData, type ReportCompanyInfo, type ReportTimeEntry, type ReportTask, type ReportWorkSession, type ReportProjectBreakdown } from '@/lib/report-pdf'
import { fetchLogoBytes } from '@/lib/pdf-generator'

export async function POST(req: NextRequest) {
  // Auth: same pattern as /api/digest/send
  const secret = req.headers.get('x-digest-secret')
  if (!secret || secret !== process.env.DIGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dateParam = req.nextUrl.searchParams.get('date')
  const targetDate = dateParam ? new Date(dateParam + 'T00:00:00') : (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  })()

  const dateStr = targetDate.toISOString().split('T')[0]
  const dayStart = new Date(targetDate)
  const dayEnd = new Date(dayStart.getTime() + 864e5)

  // Get all active non-CLIENT users
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { not: 'CLIENT' } },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, jobTitle: true },
  })

  // Get ADMIN and PM users for email recipients
  const recipients = users.filter(u => ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'PM'].includes(u.role))

  // Fetch company profile + logo for PDF header
  const companyProfile = await prisma.companyProfile.findFirst()
  let logoBytes: Uint8Array | null = null
  let logoMimeType = 'image/png'
  if (companyProfile?.logoUrl) {
    const logoUrl = companyProfile.logoUrl
    // SVG not supported by pdf-lib, and relative paths need special handling
    if (logoUrl.endsWith('.svg') || !logoUrl.startsWith('http')) {
      // Fallback: read logo-dark.png from public directory
      try {
        const pngPath = join(process.cwd(), 'public', 'logo-dark.png')
        const buf = await readFile(pngPath)
        logoBytes = new Uint8Array(buf)
        logoMimeType = 'image/png'
      } catch { /* no logo available */ }
    } else {
      const logo = await fetchLogoBytes(logoUrl)
      if (logo) { logoBytes = logo.bytes as Uint8Array; logoMimeType = logo.mime }
    }
  }
  const companyInfo: ReportCompanyInfo = {
    ragioneSociale: companyProfile?.ragioneSociale || brand.company,
    partitaIva: companyProfile?.partitaIva || '',
    indirizzo: companyProfile?.indirizzo,
    cap: companyProfile?.cap,
    citta: companyProfile?.citta,
    provincia: companyProfile?.provincia,
    telefono: companyProfile?.telefono,
    email: companyProfile?.email,
    siteUrl: companyProfile?.siteUrl,
    logoBytes,
    logoMimeType,
    primaryColor: '#3B82F6',
    secondaryColor: '#1E293B',
  }

  const generatedAt = new Date().toISOString()
  let generated = 0
  let emailed = 0
  const pdfAttachments: { name: string; content: Buffer }[] = []

  for (const user of users) {
    const userName = `${user.firstName} ${user.lastName}`

    const [completedTasks, createdTasks, activeTasksList, timeEntries, activities, workSessions] = await Promise.all([
      prisma.task.findMany({
        where: {
          completedAt: { gte: dayStart, lt: dayEnd },
          OR: [{ assigneeId: user.id }, { assignments: { some: { userId: user.id } } }],
        },
        select: {
          title: true, priority: true, status: true, dueDate: true,
          estimatedHours: true, tags: true,
          project: { select: { name: true } },
        },
        take: 30,
      }),
      prisma.task.findMany({
        where: {
          createdAt: { gte: dayStart, lt: dayEnd },
          creatorId: user.id,
        },
        select: { id: true },
      }),
      prisma.task.findMany({
        where: {
          status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
          OR: [{ assigneeId: user.id }, { assignments: { some: { userId: user.id } } }],
        },
        select: {
          title: true, priority: true, status: true, dueDate: true,
          estimatedHours: true, tags: true,
          project: { select: { name: true } },
        },
        take: 30,
      }),
      prisma.timeEntry.findMany({
        where: { userId: user.id, date: { gte: dayStart, lt: dayEnd } },
        select: {
          description: true, hours: true, billable: true, hourlyRate: true,
          task: {
            select: {
              title: true,
              parentId: true,
              parent: { select: { title: true } },
              folder: { select: { name: true } },
              project: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.findMany({
        where: { userId: user.id, createdAt: { gte: dayStart, lt: dayEnd } },
        select: { action: true, entityType: true, entityId: true, metadata: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.workSession.findMany({
        where: { userId: user.id, clockIn: { gte: dayStart, lt: dayEnd } },
        select: { clockIn: true, clockOut: true, durationMins: true, notes: true },
        orderBy: { clockIn: 'asc' },
      }),
    ])

    const totalHours = timeEntries.reduce((s, e) => s + e.hours, 0)
    const billableHours = timeEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0)
    const nonBillableHours = totalHours - billableHours

    // Compute billable value (sum hours * hourlyRate for billable entries)
    const billableValue = timeEntries
      .filter(e => e.billable && e.hourlyRate)
      .reduce((s, e) => s + e.hours * Number(e.hourlyRate), 0)

    // Work session minutes
    const workSessionMinutes = workSessions.reduce((s, ws) => s + (ws.durationMins ?? 0), 0)

    // Billable percentage
    const billablePercentage = totalHours > 0 ? (billableHours / totalHours) * 100 : 0

    // Project breakdown
    const projMap = new Map<string, { totalH: number; billH: number; nonBillH: number; count: number }>()
    for (const e of timeEntries) {
      const pName = e.task?.project?.name || 'Senza progetto'
      const existing = projMap.get(pName) || { totalH: 0, billH: 0, nonBillH: 0, count: 0 }
      existing.totalH += e.hours
      if (e.billable) existing.billH += e.hours
      else existing.nonBillH += e.hours
      existing.count++
      projMap.set(pName, existing)
    }
    const projectBreakdown: ReportProjectBreakdown[] = [...projMap.entries()]
      .sort((a, b) => b[1].totalH - a[1].totalH)
      .map(([name, d]) => ({
        projectName: name,
        totalHours: d.totalH,
        billableHours: d.billH,
        nonBillableHours: d.nonBillH,
        entryCount: d.count,
        percentage: totalHours > 0 ? (d.totalH / totalHours) * 100 : 0,
      }))

    // Skip users with zero activity
    if (totalHours === 0 && completedTasks.length === 0 && createdTasks.length === 0 && activities.length === 0) {
      continue
    }

    // Map tasks for PDF
    const mapTask = (t: typeof completedTasks[number]): ReportTask => ({
      title: t.title,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate?.toISOString() ?? null,
      projectName: t.project?.name ?? null,
      estimatedHours: t.estimatedHours,
      tags: t.tags,
    })

    const reportData: DailyReportData = {
      userName,
      userEmail: user.email,
      userRole: user.jobTitle || user.role,
      date: dateStr,
      generatedAt,
      kpi: {
        hoursLogged: totalHours,
        billableHours,
        nonBillableHours,
        billablePercentage,
        billableValue,
        tasksCompleted: completedTasks.length,
        tasksCreated: createdTasks.length,
        activeTasks: activeTasksList.length,
        activityCount: activities.length,
        workSessionMinutes,
      },
      timeEntries: timeEntries.map(e => ({
        description: e.description,
        taskTitle: e.task?.title,
        isSubtask: !!e.task?.parentId,
        parentTitle: e.task?.parent?.title ?? null,
        projectName: e.task?.project?.name,
        activityType: e.task?.folder?.name ?? null,
        startTime: null,
        endTime: null,
        hours: e.hours,
        billable: e.billable,
        hourlyRate: e.hourlyRate ? Number(e.hourlyRate) : null,
      } satisfies ReportTimeEntry)),
      workSessions: workSessions.map((ws): ReportWorkSession => ({
        clockIn: ws.clockIn.toISOString(),
        clockOut: ws.clockOut?.toISOString() ?? null,
        durationMins: ws.durationMins,
        notes: ws.notes,
      })),
      projectBreakdown,
      completedTasks: completedTasks.map(mapTask),
      activeTasks: activeTasksList.map(mapTask),
      activities: await (async () => {
        // Enrich activity metadata with task titles (for old entries missing title)
        const taskActivityIds = activities
          .filter(a => a.entityType === 'TASK' && a.entityId)
          .map(a => a.entityId)
        const taskMap = new Map<string, { title: string; projectName?: string }>()
        if (taskActivityIds.length > 0) {
          const tasks = await prisma.task.findMany({
            where: { id: { in: [...new Set(taskActivityIds)] } },
            select: { id: true, title: true, project: { select: { name: true } } },
          })
          for (const t of tasks) {
            taskMap.set(t.id, { title: t.title, projectName: t.project?.name ?? undefined })
          }
        }
        return activities.map(a => {
          const meta = (a.metadata as Record<string, unknown>) || {}
          if (a.entityType === 'TASK' && !meta.title && taskMap.has(a.entityId)) {
            const task = taskMap.get(a.entityId)!
            meta.title = task.title
            if (task.projectName) meta.projectName = task.projectName
          }
          return {
            action: a.action,
            entityType: a.entityType,
            metadata: meta,
            createdAt: a.createdAt.toISOString(),
          }
        })
      })(),
    }

    // Generate PDF
    const pdfBytes = await generateReportPdf(reportData, companyInfo)
    const pdfBuffer = Buffer.from(pdfBytes)

    // Upload to MinIO
    const s3Key = `reports/daily/${dateStr}/${user.id}.pdf`
    const pdfUrl = await uploadFile(s3Key, pdfBuffer, 'application/pdf')

    // Save to DB (upsert to handle re-runs)
    await prisma.dailyReport.upsert({
      where: { userId_date: { userId: user.id, date: targetDate } },
      update: {
        pdfUrl,
        summary: {
          hoursLogged: totalHours,
          billableHours,
          tasksCompleted: completedTasks.length,
          tasksCreated: createdTasks.length,
          activeTasks: activeTasksList.length,
          activityCount: activities.length,
        },
      },
      create: {
        userId: user.id,
        date: targetDate,
        pdfUrl,
        summary: {
          hoursLogged: totalHours,
          billableHours,
          tasksCompleted: completedTasks.length,
          tasksCreated: createdTasks.length,
          activeTasks: activeTasksList.length,
          activityCount: activities.length,
        },
      },
    })

    const pdfFileName = `report-${dateStr}-${user.firstName.toLowerCase()}-${user.lastName.toLowerCase()}.pdf`

    pdfAttachments.push({
      name: pdfFileName,
      content: pdfBuffer,
    })

    // Send individual email to the user with their own report
    if (user.email) {
      const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
      try {
        const individualHtml = buildIndividualEmail(dateFormatted, userName, totalHours, completedTasks.length)
        await sendReportEmail(
          user.email,
          `Il tuo Report Giornaliero ${dateFormatted} — ${brand.name}`,
          individualHtml,
          [{ name: pdfFileName, content: pdfBuffer }]
        )
        emailed++
      } catch (err) {
        console.error(`[daily-reports] Error emailing individual ${user.email}:`, err)
      }
    }

    generated++
  }

  // Send summary email to ADMIN/PM/DIR with ALL PDFs attached
  if (pdfAttachments.length > 0 && recipients.length > 0) {
    const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    const html = buildNotificationEmail(dateFormatted, generated, pdfAttachments.map(a => a.name))

    for (const r of recipients) {
      try {
        await sendReportEmail(r.email, `Riepilogo Report Giornalieri ${dateFormatted} — ${brand.name}`, html, pdfAttachments)
        emailed++
      } catch (err) {
        console.error(`[daily-reports] Error emailing summary ${r.email}:`, err)
      }
    }
  }

  return NextResponse.json({ ok: true, date: dateStr, generated, emailed })
}

// ─── Email with attachments ─────────────────────────────────

async function sendReportEmail(
  to: string,
  subject: string,
  html: string,
  attachments: { name: string; content: Buffer }[]
): Promise<void> {
  const SMTP_HOST = process.env.SMTP_HOST
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587')
  const SMTP_USER = process.env.SMTP_USER
  const SMTP_PASS = process.env.SMTP_PASS
  const SMTP_FROM = process.env.SMTP_FROM || brand.email.from

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`[daily-reports] SMTP non configurato, email simulata a ${to}`)
    return
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodemailer = require('nodemailer')
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html,
    attachments: attachments.map(a => ({
      filename: a.name,
      content: a.content,
      contentType: 'application/pdf',
    })),
  })
}

// ─── Email HTML ─────────────────────────────────────────────

function buildIndividualEmail(dateFormatted: string, userName: string, totalHours: number, tasksCompleted: number): string {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color:#1e293b;margin:0 0 8px;">Il tuo Report — ${dateFormatted}</h2>
    <p style="color:#64748b;font-size:14px;margin:0 0 20px;">
      Ciao <strong>${userName}</strong>, ecco il riepilogo della tua giornata.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;gap:24px;">
        <div>
          <p style="color:#475569;font-size:12px;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Ore registrate</p>
          <p style="color:#1e293b;font-size:24px;font-weight:700;margin:0;">${totalHours.toFixed(1)}</p>
        </div>
        <div>
          <p style="color:#475569;font-size:12px;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.5px;">Task completati</p>
          <p style="color:#1e293b;font-size:24px;font-weight:700;margin:0;">${tasksCompleted}</p>
        </div>
      </div>
    </div>
    <p style="color:#64748b;font-size:13px;margin:0 0 20px;">
      Il report completo è allegato in formato PDF.
    </p>
    <p style="color:#94a3b8;font-size:11px;margin:0;">
      ${brand.email.footerText} — Generato automaticamente da ${brand.name}
    </p>
  </div>
</body>
</html>`
}

function buildNotificationEmail(dateFormatted: string, reportCount: number, fileNames: string[]): string {
  const fileList = fileNames.map(f => `<li style="padding:4px 0;font-size:13px;color:#374151;">${f}</li>`).join('')

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <h2 style="color:#1e293b;margin:0 0 8px;">Report Giornalieri — ${dateFormatted}</h2>
    <p style="color:#64748b;font-size:14px;margin:0 0 20px;">
      Sono stati generati <strong>${reportCount}</strong> report giornalieri. Trovi i PDF in allegato.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="color:#475569;font-size:12px;font-weight:600;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Report allegati:</p>
      <ul style="margin:0;padding:0 0 0 16px;">${fileList}</ul>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin:0;">
      ${brand.email.footerText} — Generato automaticamente da ${brand.name}
    </p>
  </div>
</body>
</html>`
}
