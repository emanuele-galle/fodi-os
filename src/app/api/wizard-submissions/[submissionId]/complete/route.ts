import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { submissionId } = await params

    const existing = await prisma.wizardSubmission.findUnique({ where: { id: submissionId } })
    if (!existing) {
      return NextResponse.json({ error: 'Submission non trovata' }, { status: 404 })
    }

    if (existing.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Submission gia completata' }, { status: 400 })
    }

    const submission = await prisma.wizardSubmission.update({
      where: { id: submissionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: { template: { select: { name: true, completionMessage: true } } },
    })

    return NextResponse.json(submission)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[wizard-submissions/:submissionId/complete]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
