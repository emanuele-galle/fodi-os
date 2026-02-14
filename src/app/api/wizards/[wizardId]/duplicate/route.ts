import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest, { params }: { params: Promise<{ wizardId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id') || ''
    requirePermission(role, 'erp', 'write')

    const { wizardId } = await params

    const original = await prisma.wizardTemplate.findUnique({
      where: { id: wizardId },
      include: {
        steps: {
          orderBy: { sortOrder: 'asc' },
          include: { fields: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    })

    if (!original) {
      return NextResponse.json({ error: 'Wizard non trovato' }, { status: 404 })
    }

    const newName = `${original.name} (copia)`
    let newSlug = slugify(newName)
    const existingSlug = await prisma.wizardTemplate.findUnique({ where: { slug: newSlug } })
    if (existingSlug) {
      newSlug = `${newSlug}-${Date.now()}`
    }

    const duplicate = await prisma.wizardTemplate.create({
      data: {
        name: newName,
        slug: newSlug,
        description: original.description,
        category: original.category,
        isSystem: false,
        status: 'DRAFT',
        creatorId: userId,
        allowSaveProgress: original.allowSaveProgress,
        showProgressBar: original.showProgressBar,
        completionMessage: original.completionMessage,
        steps: {
          create: original.steps.map((step) => ({
            title: step.title,
            description: step.description,
            sortOrder: step.sortOrder,
            condition: step.condition ?? undefined,
            fields: {
              create: step.fields.map((field) => ({
                label: field.label,
                name: field.name,
                type: field.type,
                placeholder: field.placeholder,
                helpText: field.helpText,
                isRequired: field.isRequired,
                sortOrder: field.sortOrder,
                options: field.options ?? undefined,
                validation: field.validation ?? undefined,
                defaultValue: field.defaultValue,
                condition: field.condition ?? undefined,
                crmMapping: field.crmMapping,
              })),
            },
          })),
        },
      },
      include: {
        _count: { select: { steps: true, submissions: true } },
      },
    })

    return NextResponse.json(duplicate, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wizards/:wizardId/duplicate]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
