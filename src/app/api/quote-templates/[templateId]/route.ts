import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateQuoteTemplateSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { templateId } = await params

    const template = await prisma.quoteTemplate.findUnique({
      where: { id: templateId },
      include: {
        client: { select: { id: true, companyName: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { quotes: true } },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template non trovato' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { templateId } = await params
    const body = await request.json()
    const parsed = updateQuoteTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { lineItems, clientId, ...rest } = parsed.data

    // If lineItems provided, replace all
    if (lineItems) {
      await prisma.quoteTemplateLineItem.deleteMany({ where: { templateId } })
      await prisma.quoteTemplateLineItem.createMany({
        data: lineItems.map((item, i) => ({
          templateId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sortOrder: item.sortOrder ?? i,
        })),
      })
    }

    const updateData: Record<string, unknown> = { ...rest }
    if (clientId !== undefined) updateData.clientId = clientId || null

    const template = await prisma.quoteTemplate.update({
      where: { id: templateId },
      data: updateData,
      include: {
        client: { select: { id: true, companyName: true } },
        lineItems: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { quotes: true } },
      },
    })

    return NextResponse.json(template)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'delete')

    const { templateId } = await params

    const template = await prisma.quoteTemplate.findUnique({
      where: { id: templateId },
      select: { _count: { select: { quotes: true } } },
    })
    if (!template) {
      return NextResponse.json({ error: 'Template non trovato' }, { status: 404 })
    }

    // If template has quotes, soft-delete by deactivating
    if (template._count.quotes > 0) {
      await prisma.quoteTemplate.update({
        where: { id: templateId },
        data: { isActive: false },
      })
      return NextResponse.json({ success: true, deactivated: true })
    }

    await prisma.quoteTemplate.delete({ where: { id: templateId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
