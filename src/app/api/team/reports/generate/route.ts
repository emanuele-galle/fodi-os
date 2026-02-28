import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { uploadFile } from '@/lib/s3'
import { sendViaSMTP } from '@/lib/email'
import { buildReportIndividualEmail, buildReportSummaryEmail } from '@/lib/email-templates'
import { generateReportPdf, type DailyReportData, type ReportCompanyInfo, type ReportTimeEntry, type ReportTask, type ReportWorkSession, type ReportProjectBreakdown } from '@/lib/report-pdf'
import { fetchLogoBytes } from '@/lib/pdf-generator'
import { handleApiError } from '@/lib/api-error'
import { logger } from '@/lib/logger'

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function POST(req: NextRequest) {
  // Auth: unified CRON_SECRET pattern (same as check-deadlines, digest)
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
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
      // Fallback: read brand logo from public directory (only PNG/JPG supported by pdf-lib)
      try {
        const brandLogoPath = brand.logo.dark
        const pngFallback = brandLogoPath.endsWith('.svg')
          ? join(process.cwd(), 'public', 'logo-dark.png')  // SVG not supported by pdf-lib
          : join(process.cwd(), 'public', brandLogoPath)
        const buf = await readFile(pngFallback)
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
        const individualHtml = buildReportIndividualEmail({ dateFormatted, userName, totalHours, tasksCompleted: completedTasks.length })
        await sendViaSMTP(
          user.email,
          `Il tuo Report Giornaliero ${dateFormatted} — ${brand.name}`,
          individualHtml,
          undefined,
          { attachments: [{ name: pdfFileName, content: pdfBuffer }] }
        )
        emailed++
      } catch (err) {
        logger.error(`[daily-reports] Error emailing individual ${user.email}`, { error: err instanceof Error ? err.message : String(err) })
      }
    }

    generated++
  }

  // Send summary email to ADMIN/PM/DIR with ALL PDFs attached
  if (pdfAttachments.length > 0 && recipients.length > 0) {
    const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    const html = buildReportSummaryEmail({ dateFormatted, reportCount: generated, fileNames: pdfAttachments.map(a => a.name) })

    for (const r of recipients) {
      try {
        await sendViaSMTP(
          r.email,
          `Riepilogo Report Giornalieri ${dateFormatted} — ${brand.name}`,
          html,
          undefined,
          { attachments: pdfAttachments }
        )
        emailed++
      } catch (err) {
        logger.error(`[daily-reports] Error emailing summary ${r.email}`, { error: err instanceof Error ? err.message : String(err) })
      }
    }
  }

  return NextResponse.json({ ok: true, date: dateStr, generated, emailed })
  } catch (e) {
    return handleApiError(e)
  }
}
