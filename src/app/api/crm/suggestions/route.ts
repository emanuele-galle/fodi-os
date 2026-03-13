import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { brand } from '@/lib/branding'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const clientId = searchParams.get('clientId')
    const priority = searchParams.get('priority')
    const status = searchParams.get('status') || 'PENDING'
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50)

    const where: Record<string, unknown> = {
      brandSlug: brand.slug,
      status,
    }
    if (type) where.type = type
    if (clientId) where.clientId = clientId
    if (priority) where.priority = priority

    const suggestions = await prisma.aiSuggestion.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        priority: true,
        actionType: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        client: { select: { id: true, companyName: true } },
      },
    })

    return NextResponse.json({ success: true, data: suggestions })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/suggestions/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore nel recupero suggerimenti' }, { status: 500 })
  }
}
