import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Protetto dal middleware JWT - solo utenti autenticati
    const userRole = request.headers.get('x-user-role')
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
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

    for (const task of dueTasks) {
      const link = `/tasks?id=${task.id}`
      const exists = await prisma.notification.findFirst({
        where: {
          link,
          isRead: false,
          createdAt: { gte: twentyFourHoursAgo },
        },
      })
      if (exists) continue

      await prisma.notification.create({
        data: {
          userId: task.assigneeId!,
          type: 'reminder',
          title: `Task in scadenza: ${task.title}`,
          message: 'Questo task scade entro 24 ore.',
          link,
        },
      })
      generated.tasks++
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

    for (const client of activeClients) {
      const lastInteraction = client.interactions[0]?.date
      if (lastInteraction && new Date(lastInteraction) > sixtyDaysAgo) continue

      const link = `/crm/${client.id}`
      const exists = await prisma.notification.findFirst({
        where: {
          link,
          isRead: false,
          createdAt: { gte: twentyFourHoursAgo },
        },
      })
      if (exists) continue

      for (const admin of adminUsers) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'reminder',
            title: `Cliente inattivo: ${client.companyName}`,
            message: 'Nessuna interazione negli ultimi 60 giorni.',
            link,
          },
        })
      }
      generated.clients++
    }

    // --- 3. Stale deals >30 days ---
    const staleDeals = await prisma.deal.findMany({
      where: {
        stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
        updatedAt: { lt: thirtyDaysAgo },
      },
      select: { id: true, title: true, ownerId: true },
    })

    for (const deal of staleDeals) {
      const link = `/crm/deals?id=${deal.id}`
      const exists = await prisma.notification.findFirst({
        where: {
          link,
          isRead: false,
          createdAt: { gte: twentyFourHoursAgo },
        },
      })
      if (exists) continue

      await prisma.notification.create({
        data: {
          userId: deal.ownerId,
          type: 'reminder',
          title: `Deal fermo: ${deal.title}`,
          message: 'Questo deal non viene aggiornato da oltre 30 giorni.',
          link,
        },
      })
      generated.deals++
    }

    return NextResponse.json({ generated })
  } catch (e) {
    console.error('[reminders/generate]', e)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
