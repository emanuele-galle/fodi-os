import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { brand } from '@/lib/branding'
import type { Role, Prisma } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const rules = await prisma.touchpointRule.findMany({
      where: { brandSlug: brand.slug },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: rules })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Errore' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const body = await request.json()
    const rule = await prisma.touchpointRule.create({
      data: {
        name: body.name,
        triggerType: body.triggerType,
        triggerConfig: body.triggerConfig as Prisma.InputJsonValue,
        actionType: body.actionType,
        actionConfig: body.actionConfig as Prisma.InputJsonValue,
        brandSlug: brand.slug,
      },
    })
    return NextResponse.json({ success: true, data: rule })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Errore nella creazione' }, { status: 500 })
  }
}
