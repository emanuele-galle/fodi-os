import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateWizardTemplateSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ wizardId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { wizardId } = await params

    const wizard = await prisma.wizardTemplate.findUnique({
      where: { id: wizardId },
      include: {
        steps: {
          orderBy: { sortOrder: 'asc' },
          include: {
            fields: { orderBy: { sortOrder: 'asc' } },
          },
        },
        _count: { select: { submissions: true } },
      },
    })

    if (!wizard) {
      return NextResponse.json({ error: 'Wizard non trovato' }, { status: 404 })
    }

    return NextResponse.json(wizard)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wizards/:wizardId]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ wizardId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { wizardId } = await params
    const body = await request.json()
    const parsed = updateWizardTemplateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const wizard = await prisma.wizardTemplate.update({
      where: { id: wizardId },
      data: parsed.data,
      include: {
        steps: {
          orderBy: { sortOrder: 'asc' },
          include: { fields: { orderBy: { sortOrder: 'asc' } } },
        },
        _count: { select: { submissions: true } },
      },
    })

    return NextResponse.json(wizard)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wizards/:wizardId]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ wizardId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'delete')

    const { wizardId } = await params

    await prisma.wizardTemplate.delete({ where: { id: wizardId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wizards/:wizardId]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
