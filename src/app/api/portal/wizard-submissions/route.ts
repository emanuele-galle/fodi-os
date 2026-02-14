import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSubmissionSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
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
    if (!template || template.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Wizard non disponibile' }, { status: 404 })
    }

    const submission = await prisma.wizardSubmission.create({
      data: {
        templateId: parsed.data.templateId,
        clientId: parsed.data.clientId,
        leadId: parsed.data.leadId,
        submitterName: parsed.data.submitterName,
        submitterEmail: parsed.data.submitterEmail,
        status: 'IN_PROGRESS',
        currentStep: 0,
        answers: {},
      },
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
