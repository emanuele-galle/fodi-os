import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Protetto dal middleware JWT - solo utenti autenticati
    const userRole = request.headers.get('x-user-role')
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    if (!rateLimit('reminders-generate', 1, 60000)) {
      return NextResponse.json({ error: 'Generazione reminder già in corso. Riprova tra un minuto.' }, { status: 429 })
    }

    const now = new Date()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const generated = { tasks: 0, clients: 0, deals: 0 }

    // --- 1. Tasks due within 24h ---
    const dueTasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: now, lte: twentyFourHoursFromNow },
        status: { notIn: ['DONE', 'CANCELLED'] },
        assigneeId: { not: null },
      },
      select: { id: true, title: true, assigneeId: true },
    })

    // Batch check: find existing unread notifications for these links
    const taskLinks = dueTasks.map((t) => `/tasks?id=${t.id}`)
    const existingTaskNotifs = taskLinks.length > 0
      ? await prisma.notification.findMany({
          where: { link: { in: taskLinks }, isRead: false, createdAt: { gte: twentyFourHoursAgo } },
          select: { link: true },
        })
      : []
    const existingTaskLinks = new Set(existingTaskNotifs.map((n) => n.link))

    const taskNotifsToCreate = dueTasks
      .filter((task) => !existingTaskLinks.has(`/tasks?id=${task.id}`))
      .map((task) => ({
        userId: task.assigneeId!,
        type: 'reminder',
        title: `Task in scadenza: ${task.title}`,
        message: 'Questo task scade entro 24 ore.',
        link: `/tasks?id=${task.id}`,
      }))

    if (taskNotifsToCreate.length > 0) {
      await prisma.notification.createMany({ data: taskNotifsToCreate })
      generated.tasks = taskNotifsToCreate.length
    }

    // --- 2. Inactive clients >60 days ---
    const activeClients = await prisma.client.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        companyName: true,
        interactions: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { date: true },
        },
      },
    })

    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    })

    const inactiveClients = activeClients.filter((client) => {
      const lastInteraction = client.interactions[0]?.date
      return !lastInteraction || new Date(lastInteraction) <= sixtyDaysAgo
    })

    const clientLinks = inactiveClients.map((c) => `/crm/${c.id}`)
    const existingClientNotifs = clientLinks.length > 0
      ? await prisma.notification.findMany({
          where: { link: { in: clientLinks }, isRead: false, createdAt: { gte: twentyFourHoursAgo } },
          select: { link: true },
        })
      : []
    const existingClientLinks = new Set(existingClientNotifs.map((n) => n.link))

    const clientNotifsToCreate = inactiveClients
      .filter((client) => !existingClientLinks.has(`/crm/${client.id}`))
      .flatMap((client) =>
        adminUsers.map((admin) => ({
          userId: admin.id,
          type: 'reminder',
          title: `Cliente inattivo: ${client.companyName}`,
          message: 'Nessuna interazione negli ultimi 60 giorni.',
          link: `/crm/${client.id}`,
        }))
      )

    if (clientNotifsToCreate.length > 0) {
      await prisma.notification.createMany({ data: clientNotifsToCreate })
      generated.clients = inactiveClients.filter((c) => !existingClientLinks.has(`/crm/${c.id}`)).length
    }

    // --- 3. Stale deals >30 days ---
    const staleDeals = await prisma.deal.findMany({
      where: {
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
        updatedAt: { lt: thirtyDaysAgo },
      },
      select: { id: true, title: true, ownerId: true },
    })

    const dealLinks = staleDeals.map((d) => `/crm/deals?id=${d.id}`)
    const existingDealNotifs = dealLinks.length > 0
      ? await prisma.notification.findMany({
          where: { link: { in: dealLinks }, isRead: false, createdAt: { gte: twentyFourHoursAgo } },
          select: { link: true },
        })
      : []
    const existingDealLinks = new Set(existingDealNotifs.map((n) => n.link))

    const dealNotifsToCreate = staleDeals
      .filter((deal) => !existingDealLinks.has(`/crm/deals?id=${deal.id}`))
      .map((deal) => ({
        userId: deal.ownerId,
        type: 'reminder',
        title: `Deal fermo: ${deal.title}`,
        message: 'Questo deal non viene aggiornato da oltre 30 giorni.',
        link: `/crm/deals?id=${deal.id}`,
      }))

    if (dealNotifsToCreate.length > 0) {
      await prisma.notification.createMany({ data: dealNotifsToCreate })
      generated.deals = dealNotifsToCreate.length
    }

    return NextResponse.json({ generated })
  } catch (e) {
    console.error('[reminders/generate]', e)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
