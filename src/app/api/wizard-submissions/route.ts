import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createSubmissionSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const templateId = searchParams.get('templateId')
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      ...(templateId && { templateId }),
      ...(status && { status }),
    }

    const [items, total] = await Promise.all([
      prisma.wizardSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { name: true, slug: true } },
        },
      }),
      prisma.wizardSubmission.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id') || ''
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = createSubmissionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const template = await prisma.wizardTemplate.findUnique({
      where: { id: parsed.data.templateId },
    })
    if (!template) {
      return NextResponse.json({ error: 'Wizard template non trovato' }, { status: 404 })
    }

    const submission = await prisma.wizardSubmission.create({
      data: {
        templateId: parsed.data.templateId,
        clientId: parsed.data.clientId,
        leadId: parsed.data.leadId,
        submitterId: userId || undefined,
        submitterName: parsed.data.submitterName,
        submitterEmail: parsed.data.submitterEmail,
        status: 'IN_PROGRESS',
        currentStep: 0,
        answers: {},
      },
      include: { template: { select: { name: true, slug: true } } },
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
