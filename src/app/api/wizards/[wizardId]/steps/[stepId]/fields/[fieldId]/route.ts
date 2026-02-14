import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateWizardFieldSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ wizardId: string; stepId: string; fieldId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { fieldId } = await params
    const body = await request.json()
    const parsed = updateWizardFieldSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) data[key] = value
    }

    const field = await prisma.wizardField.update({
      where: { id: fieldId },
      data,
    })

    return NextResponse.json(field)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wizards/:wizardId/steps/:stepId/fields/:fieldId]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ wizardId: string; stepId: string; fieldId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'delete')

    const { fieldId } = await params

    await prisma.wizardField.delete({ where: { id: fieldId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wizards/:wizardId/steps/:stepId/fields/:fieldId]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
