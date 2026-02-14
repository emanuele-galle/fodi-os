import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

// GET /api/erp/fatturapa/dashboard - Aggregated dashboard data
export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const tipoFilter = searchParams.get('tipo')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    // Count by status
    const statusCounts = await prisma.electronicInvoice.groupBy({
      by: ['status'],
      _count: { id: true },
    })

    const counts: Record<string, number> = {}
    let total = 0
    for (const sc of statusCounts) {
      const key = sc.status.toUpperCase()
      counts[key] = (counts[key] || 0) + sc._count.id
      total += sc._count.id
    }

    // Build where clause
    const where: Record<string, unknown> = {}
    if (statusFilter) where.status = statusFilter
    if (tipoFilter) where.tipoDocumento = tipoFilter

    // Fetch e-invoices with invoice data
    const [eInvoices, filteredTotal] = await Promise.all([
      prisma.electronicInvoice.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              number: true,
              title: true,
              total: true,
              status: true,
              issuedDate: true,
              client: {
                select: { id: true, companyName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.electronicInvoice.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      counts,
      total,
      items: eInvoices,
      filteredTotal,
      page,
      limit,
      totalPages: Math.ceil(filteredTotal / limit),
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[erp/fatturapa/dashboard]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
