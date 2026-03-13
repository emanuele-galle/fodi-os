import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { brand } from '@/lib/branding'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const templates = await prisma.emailTemplate.findMany({
      where: { brandSlug: brand.slug },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: templates })
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
    const template = await prisma.emailTemplate.create({
      data: {
        name: body.name,
        slug: body.slug,
        subject: body.subject,
        bodyHtml: body.bodyHtml,
        category: body.category || 'general',
        brandSlug: brand.slug,
        variables: body.variables || [],
      },
    })
    return NextResponse.json({ success: true, data: template })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Errore nella creazione' }, { status: 500 })
  }
}
