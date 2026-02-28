import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { updateLeadSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { leadId } = await params

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead non trovato' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: lead })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[leads/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { leadId } = await params
    const body = await request.json()
    const parsed = updateLeadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Lead non trovato' }, { status: 404 })
    }

    const { name, email, company, phone, service, message, source, status, notes, assigneeId } = parsed.data

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(company !== undefined && { company }),
        ...(phone !== undefined && { phone }),
        ...(service !== undefined && { service }),
        ...(message !== undefined && { message }),
        ...(source !== undefined && { source }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(assigneeId !== undefined && { assigneeId }),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'UPDATE', entityType: 'LEAD', entityId: leadId, metadata: { name: lead.name } })

    return NextResponse.json({ success: true, data: lead })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[leads/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'delete')

    const { leadId } = await params

    const existing = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Lead non trovato' }, { status: 404 })
    }

    await prisma.lead.delete({ where: { id: leadId } })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'DELETE', entityType: 'LEAD', entityId: leadId })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[leads/DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
