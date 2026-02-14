import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateSubmissionSchema } from '@/lib/validation'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')
    if (!userId) {
      return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 })
    }

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

    // Verify ownership: only the submitter or an ADMIN can modify
    if (existing.submitterId !== userId && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Permesso negato' }, { status: 403 })
    }

    if (existing.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Submission gia completata' }, { status: 400 })
    }

    let newAnswers = existing.answers as Record<string, unknown>
    if (parsed.data.answers) {
      newAnswers = { ...newAnswers, ...parsed.data.answers }
    }

    const isCompleting = parsed.data.status === 'COMPLETED'

    const submission = await prisma.wizardSubmission.update({
      where: { id: submissionId },
      data: {
        ...(parsed.data.currentStep !== undefined && { currentStep: parsed.data.currentStep }),
        ...(parsed.data.status !== undefined && { status: parsed.data.status }),
        ...(isCompleting && { completedAt: new Date() }),
        answers: newAnswers as Record<string, string | number | boolean | null>,
      },
    })

    return NextResponse.json(submission)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
