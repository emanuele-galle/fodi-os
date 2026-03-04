import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePortalClient, handlePortalError } from '@/lib/portal-auth'
import { createSubmissionSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 })
    }

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

    // For portal users, use requirePortalClient for proper auth
    const userRole = request.headers.get('x-user-role') as Role
    let resolvedClientId = parsed.data.clientId
    if (userRole === 'CLIENT') {
      const client = await requirePortalClient(request)
      // Override clientId to prevent cross-client access
      resolvedClientId = client.id
    }

    const submission = await prisma.wizardSubmission.create({
      data: {
        templateId: parsed.data.templateId,
        clientId: resolvedClientId,
        leadId: parsed.data.leadId,
        submitterName: parsed.data.submitterName,
        submitterEmail: parsed.data.submitterEmail,
        submitterId: userId,
        status: 'IN_PROGRESS',
        currentStep: 0,
        answers: {},
      },
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (e) {
    return handlePortalError(e, 'portal/wizard-submissions')
  }
}
