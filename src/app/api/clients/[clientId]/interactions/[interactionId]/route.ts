import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { updateInteractionSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ clientId: string; interactionId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { clientId, interactionId } = await params
    const body = await request.json()
    const parsed = updateInteractionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await prisma.interaction.findFirst({
      where: { id: interactionId, clientId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Interazione non trovata' }, { status: 404 })
    }

    const { type, subject, content, contactId, date } = parsed.data

    const interaction = await prisma.interaction.update({
      where: { id: interactionId },
      data: {
        ...(type !== undefined && { type }),
        ...(subject !== undefined && { subject }),
        ...(content !== undefined && { content }),
        ...(contactId !== undefined && { contactId }),
        ...(date !== undefined && { date: new Date(date) }),
      },
      include: { contact: true },
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'UPDATE', entityType: 'INTERACTION', entityId: interactionId, metadata: { clientId, subject: interaction.subject } })

    return NextResponse.json({ success: true, data: interaction })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[interactions/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'delete')

    const { clientId, interactionId } = await params

    const existing = await prisma.interaction.findFirst({
      where: { id: interactionId, clientId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Interazione non trovata' }, { status: 404 })
    }

    await prisma.interaction.delete({ where: { id: interactionId } })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'DELETE', entityType: 'INTERACTION', entityId: interactionId, metadata: { clientId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[interactions/DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
