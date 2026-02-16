import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { updateDealSchema } from '@/lib/validation/deals'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ dealId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { dealId } = await params
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        client: { select: { id: true, companyName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Opportunità non trovata' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: deal })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[deals/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { dealId } = await params
    const body = await request.json()
    const parsed = updateDealSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await prisma.deal.findUnique({ where: { id: dealId }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Opportunità non trovata' }, { status: 404 })
    }

    const { title, description, value, stage, probability, expectedCloseDate, actualCloseDate, lostReason, contactId } = parsed.data

    const deal = await prisma.deal.update({
      where: { id: dealId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(value !== undefined && { value }),
        ...(stage !== undefined && { stage }),
        ...(probability !== undefined && { probability }),
        ...(expectedCloseDate !== undefined && { expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null }),
        ...(actualCloseDate !== undefined && { actualCloseDate: actualCloseDate ? new Date(actualCloseDate) : null }),
        ...(lostReason !== undefined && { lostReason }),
        ...(contactId !== undefined && { contactId }),
      },
      include: {
        client: { select: { id: true, companyName: true } },
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'UPDATE', entityType: 'DEAL', entityId: dealId, metadata: { title: deal.title } })

    return NextResponse.json({ success: true, data: deal })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[deals/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'delete')

    const { dealId } = await params
    const existing = await prisma.deal.findUnique({ where: { id: dealId }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Opportunità non trovata' }, { status: 404 })
    }

    await prisma.deal.delete({ where: { id: dealId } })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'DELETE', entityType: 'DEAL', entityId: dealId })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[deals/DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
