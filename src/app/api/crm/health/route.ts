import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const [byRisk, trendingDown] = await Promise.all([
      // Count by risk level
      prisma.clientHealthScore.groupBy({
        by: ['riskLevel'],
        _count: { _all: true },
      }),

      // Clients trending down (score dropped in last month)
      prisma.clientHealthScore.findMany({
        where: {
          riskLevel: { in: ['AT_RISK', 'CRITICAL', 'CHURNING'] },
        },
        orderBy: { overallScore: 'asc' },
        take: 10,
        select: {
          clientId: true,
          overallScore: true,
          riskLevel: true,
          lastCalculatedAt: true,
          client: { select: { id: true, companyName: true, status: true } },
        },
      }),
    ])

    const riskCounts: Record<string, number> = {}
    for (const row of byRisk) {
      riskCounts[row.riskLevel] = row._count._all
    }

    return NextResponse.json({
      success: true,
      data: {
        riskCounts,
        atRiskClients: trendingDown,
      },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/health/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore nel recupero dati health' }, { status: 500 })
  }
}
