import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createWizardFieldSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wizardId: string; stepId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { stepId } = await params
    const body = await request.json()
    const parsed = createWizardFieldSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const step = await prisma.wizardStep.findUnique({ where: { id: stepId } })
    if (!step) {
      return NextResponse.json({ error: 'Step non trovato' }, { status: 404 })
    }

    // Auto sortOrder: next available
    if (parsed.data.sortOrder === 0) {
      const maxField = await prisma.wizardField.findFirst({
        where: { stepId },
        orderBy: { sortOrder: 'desc' },
      })
      parsed.data.sortOrder = (maxField?.sortOrder ?? -1) + 1
    }

    const field = await prisma.wizardField.create({
      data: {
        stepId,
        label: parsed.data.label,
        name: parsed.data.name,
        type: parsed.data.type,
        placeholder: parsed.data.placeholder,
        helpText: parsed.data.helpText,
        isRequired: parsed.data.isRequired,
        sortOrder: parsed.data.sortOrder,
        options: parsed.data.options ?? undefined,
        validation: parsed.data.validation ?? undefined,
        defaultValue: parsed.data.defaultValue,
        condition: parsed.data.condition ?? undefined,
        crmMapping: parsed.data.crmMapping,
      },
    })

    return NextResponse.json(field, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
