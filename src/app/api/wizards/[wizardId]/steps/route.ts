import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createWizardStepSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest, { params }: { params: Promise<{ wizardId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { wizardId } = await params
    const body = await request.json()
    const parsed = createWizardStepSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const wizard = await prisma.wizardTemplate.findUnique({ where: { id: wizardId } })
    if (!wizard) {
      return NextResponse.json({ error: 'Wizard non trovato' }, { status: 404 })
    }

    // Auto sortOrder: next available
    if (parsed.data.sortOrder === 0) {
      const maxStep = await prisma.wizardStep.findFirst({
        where: { templateId: wizardId },
        orderBy: { sortOrder: 'desc' },
      })
      parsed.data.sortOrder = (maxStep?.sortOrder ?? -1) + 1
    }

    const step = await prisma.wizardStep.create({
      data: {
        templateId: wizardId,
        title: parsed.data.title,
        description: parsed.data.description,
        sortOrder: parsed.data.sortOrder,
        condition: parsed.data.condition ?? undefined,
      },
      include: { fields: true },
    })

    return NextResponse.json(step, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
