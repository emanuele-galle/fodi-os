import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateSubmissionSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { submissionId } = await params

    const submission = await prisma.wizardSubmission.findUnique({
      where: { id: submissionId },
      include: {
        template: {
          include: {
            steps: {
              orderBy: { sortOrder: 'asc' },
              include: { fields: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission non trovata' }, { status: 404 })
    }

    return NextResponse.json(submission)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wizard-submissions/:submissionId]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { submissionId } = await params
    const body = await request.json()
    const parsed = updateSubmissionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const existing = await prisma.wizardSubmission.findUnique({ where: { id: submissionId } })
    if (!existing) {
      return NextResponse.json({ error: 'Submission non trovata' }, { status: 404 })
    }

    // Merge answers
    let newAnswers = existing.answers as Record<string, unknown>
    if (parsed.data.answers) {
      newAnswers = { ...newAnswers, ...parsed.data.answers }
    }

    const submission = await prisma.wizardSubmission.update({
      where: { id: submissionId },
      data: {
        ...(parsed.data.currentStep !== undefined && { currentStep: parsed.data.currentStep }),
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        answers: newAnswers as Record<string, string | number | boolean | null>,
      },
    })

    return NextResponse.json(submission)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wizard-submissions/:submissionId]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
