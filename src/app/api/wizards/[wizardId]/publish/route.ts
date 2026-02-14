import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ wizardId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { wizardId } = await params

    const wizard = await prisma.wizardTemplate.findUnique({
      where: { id: wizardId },
      include: { _count: { select: { steps: true } } },
    })

    if (!wizard) {
      return NextResponse.json({ error: 'Wizard non trovato' }, { status: 404 })
    }

    if (wizard._count.steps === 0) {
      return NextResponse.json({ error: 'Il wizard deve avere almeno uno step per essere pubblicato' }, { status: 400 })
    }

    const newStatus = wizard.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'

    const updated = await prisma.wizardTemplate.update({
      where: { id: wizardId },
      data: { status: newStatus },
    })

    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wizards/:wizardId/publish]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
