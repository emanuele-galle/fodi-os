import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [
      totalClients,
      clientsByStatus,
      totalRevenueResult,
      newClientsThisMonth,
      newClientsLastMonth,
      interactionsThisMonth,
      interactionsLastMonth,
      recentInteractions,
      topClientsByRevenue,
      neglectedClients,
      dealsByStageRaw,
      wonDealsRaw,
      lostDealsCount,
      interactionsByTypeRaw,
      pipelineValueResult,
      leadsByStatusRaw,
      avgDealValueResult,
      overdueTasksCount,
      dealsClosingSoon,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.groupBy({ by: ['status'], _count: true }),
      prisma.client.aggregate({ _sum: { totalRevenue: true } }),
      prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.client.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
      prisma.interaction.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.interaction.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
      prisma.interaction.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        include: { client: { select: { id: true, companyName: true } } },
      }),
      prisma.client.findMany({
        take: 5,
        orderBy: { totalRevenue: 'desc' },
        where: { totalRevenue: { gt: 0 } },
        select: { id: true, companyName: true, totalRevenue: true, status: true },
      }),
      prisma.client.findMany({
        where: {
          status: 'ACTIVE',
          interactions: { none: { date: { gte: thirtyDaysAgo } } },
        },
        select: {
          id: true, companyName: true, status: true,
          interactions: { take: 1, orderBy: { date: 'desc' }, select: { date: true } },
        },
        take: 10,
      }),
      // Deals by stage with count and total value
      prisma.deal.groupBy({
        by: ['stage'],
        _count: true,
        _sum: { value: true },
      }),
      // Won deals (for monthly breakdown and conversion)
      prisma.deal.findMany({
        where: { stage: 'CLOSED_WON', actualCloseDate: { gte: sixMonthsAgo } },
        select: { value: true, actualCloseDate: true },
      }),
      // Lost deals count (for conversion rate)
      prisma.deal.count({ where: { stage: 'CLOSED_LOST' } }),
      // Interactions by type
      prisma.interaction.groupBy({
        by: ['type'],
        _count: true,
      }),
      // Pipeline value (non-closed deals)
      prisma.deal.aggregate({
        where: { stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] } },
        _sum: { value: true },
      }),
      // Leads grouped by status
      prisma.lead.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Average deal value
      prisma.deal.aggregate({
        _avg: { value: true },
      }),
      // Overdue tasks (CRM-related: clientId not null)
      prisma.task.count({
        where: {
          dueDate: { lt: now },
          status: { not: 'DONE' },
          clientId: { not: null },
        },
      }),
      // Deals closing within 7 days
      prisma.deal.findMany({
        where: {
          expectedCloseDate: { gte: now, lte: sevenDaysFromNow },
          stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
        },
        include: { client: { select: { id: true, companyName: true } } },
        orderBy: { expectedCloseDate: 'asc' },
      }),
    ])

    const statusMap: Record<string, number> = {}
    for (const s of clientsByStatus) statusMap[s.status] = s._count
    const totalRevenue = totalRevenueResult._sum.totalRevenue?.toString() || '0'

    // Deals by stage
    const dealsByStage = dealsByStageRaw.map((d) => ({
      stage: d.stage,
      count: d._count,
      value: Number(d._sum.value || 0),
    }))

    // Won deals monthly (last 6 months)
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
    const wonByMonth: Record<string, { count: number; value: number }> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`
      wonByMonth[key] = { count: 0, value: 0 }
    }
    for (const deal of wonDealsRaw) {
      if (deal.actualCloseDate) {
        const d = new Date(deal.actualCloseDate)
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`
        if (wonByMonth[key]) {
          wonByMonth[key].count++
          wonByMonth[key].value += Number(deal.value || 0)
        }
      }
    }
    const wonDealsMonthly = Object.entries(wonByMonth).map(([month, data]) => ({
      month,
      count: data.count,
      value: data.value,
    }))

    // Interactions by type
    const interactionsByType = interactionsByTypeRaw.map((i) => ({
      type: i.type,
      count: i._count,
    }))

    // Conversion rate
    const wonCount = dealsByStageRaw.find((d) => d.stage === 'CLOSED_WON')?._count || 0
    const totalClosed = wonCount + lostDealsCount
    const conversionRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0

    const totalPipelineValue = pipelineValueResult._sum.value?.toString() || '0'

    // Leads by status map
    const leadsByStatus: Record<string, number> = {}
    for (const l of leadsByStatusRaw) leadsByStatus[l.status] = l._count

    const avgDealValue = avgDealValueResult._avg.value?.toString() || '0'

    return NextResponse.json({
      success: true,
      data: {
        totalClients,
        clientsByStatus: statusMap,
        totalRevenue,
        newClientsThisMonth,
        newClientsLastMonth,
        interactionsThisMonth,
        interactionsLastMonth,
        recentInteractions,
        topClientsByRevenue,
        neglectedClients,
        dealsByStage,
        wonDealsMonthly,
        interactionsByType,
        conversionRate,
        totalPipelineValue,
        leadsByStatus,
        avgDealValue,
        overdueTasksCount,
        dealsClosingSoon,
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/stats]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
