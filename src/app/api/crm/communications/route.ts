import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (clientId) where.clientId = clientId
    if (status) where.status = status
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [communications, total] = await Promise.all([
      prisma.campaignSend.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          campaignName: true,
          contactEmail: true,
          subject: true,
          bodyHtml: true,
          scenario: true,
          status: true,
          sentAt: true,
          createdAt: true,
          client: { select: { id: true, companyName: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          sentBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.campaignSend.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: communications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/communications/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore nel recupero comunicazioni' }, { status: 500 })
  }
}
