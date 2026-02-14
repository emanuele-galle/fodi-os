import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { slugify } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { submissionId } = await params

    const submission = await prisma.wizardSubmission.findUnique({
      where: { id: submissionId },
      include: {
        template: {
          include: {
            steps: {
              include: { fields: true },
            },
          },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission non trovata' }, { status: 404 })
    }

    const answers = submission.answers as Record<string, unknown>

    // Collect mapped values
    const clientData: Record<string, string> = {}
    const contactData: Record<string, string> = {}

    for (const step of submission.template.steps) {
      for (const field of step.fields) {
        if (field.crmMapping && answers[field.name] !== undefined && answers[field.name] !== '') {
          const [entity, prop] = field.crmMapping.split('.')
          const value = String(answers[field.name])
          if (entity === 'client') clientData[prop] = value
          else if (entity === 'contact') contactData[prop] = value
        }
      }
    }

    let clientId = submission.clientId
    let contactId: string | null = null

    // Create or update client
    if (Object.keys(clientData).length > 0) {
      if (clientId) {
        await prisma.client.update({
          where: { id: clientId },
          data: clientData,
        })
      } else if (clientData.companyName) {
        const slug = slugify(clientData.companyName)
        const existing = await prisma.client.findUnique({ where: { slug } })
        if (existing) {
          clientId = existing.id
          await prisma.client.update({ where: { id: clientId }, data: clientData })
        } else {
          const client = await prisma.client.create({
            data: { ...clientData, slug, companyName: clientData.companyName },
          })
          clientId = client.id
        }
        // Update submission with client reference
        await prisma.wizardSubmission.update({
          where: { id: submissionId },
          data: { clientId },
        })
      }
    }

    // Create contact if we have data and a client
    if (Object.keys(contactData).length > 0 && clientId) {
      if (contactData.firstName || contactData.lastName) {
        const contact = await prisma.contact.create({
          data: {
            clientId,
            firstName: contactData.firstName || '',
            lastName: contactData.lastName || '',
            email: contactData.email,
            phone: contactData.phone,
            role: contactData.role,
            notes: contactData.notes,
          },
        })
        contactId = contact.id
      }
    }

    return NextResponse.json({
      success: true,
      clientId,
      contactId,
      mappedFields: {
        client: Object.keys(clientData).length,
        contact: Object.keys(contactData).length,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
