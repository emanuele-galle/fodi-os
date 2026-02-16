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
      neglectedClients
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
    ])

    const statusMap: Record<string, number> = {}
    for (const s of clientsByStatus) statusMap[s.status] = s._count
    const totalRevenue = totalRevenueResult._sum.totalRevenue?.toString() || '0'

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
