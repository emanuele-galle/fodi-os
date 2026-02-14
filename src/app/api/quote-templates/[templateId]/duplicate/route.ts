import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const userId = request.headers.get('x-user-id')!
    const { templateId } = await params

    const source = await prisma.quoteTemplate.findUnique({
      where: { id: templateId },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!source) {
      return NextResponse.json({ error: 'Template non trovato' }, { status: 404 })
    }

    const newName = `${source.name} (copia)`
    let slug = slugify(newName)
    const existing = await prisma.quoteTemplate.findUnique({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const duplicate = await prisma.quoteTemplate.create({
      data: {
        name: newName,
        slug,
        description: source.description,
        isGlobal: source.isGlobal,
        clientId: source.clientId,
        creatorId: userId,
        logoUrl: source.logoUrl,
        primaryColor: source.primaryColor,
        secondaryColor: source.secondaryColor,
        headerHtml: source.headerHtml,
        footerHtml: source.footerHtml,
        sections: source.sections as never,
        numberPrefix: source.numberPrefix,
        numberFormat: source.numberFormat,
        defaultTaxRate: source.defaultTaxRate,
        defaultDiscount: source.defaultDiscount,
        defaultNotes: source.defaultNotes,
        defaultValidDays: source.defaultValidDays,
        termsAndConditions: source.termsAndConditions,
        lineItems: {
          create: source.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: {
        client: { select: { id: true, companyName: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
      },
    })

    return NextResponse.json(duplicate, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[quote-templates/:templateId/duplicate]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
