import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { convertLeadSchema } from '@/lib/validation'
import { slugify } from '@/lib/utils'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { leadId } = await params
    const body = await request.json()
    const parsed = convertLeadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead non trovato' }, { status: 404 })
    }

    if (lead.status === 'CONVERTED') {
      return NextResponse.json({ success: false, error: 'Lead già convertito' }, { status: 400 })
    }

    const { companyName, industry, source, status } = parsed.data

    const nameParts = lead.name.split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          companyName,
          slug: slugify(companyName),
          source: source || lead.source,
          notes: lead.message,
          status: status || 'PROSPECT',
          industry: industry || null,
        },
      })

      await tx.contact.create({
        data: {
          clientId: client.id,
          firstName,
          lastName,
          email: lead.email,
          phone: lead.phone || null,
          isPrimary: true,
        },
      })

      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: 'CONVERTED',
          notes: lead.notes
            ? `${lead.notes}\nConvertito in cliente: ${companyName}`
            : `Convertito in cliente: ${companyName}`,
        },
      })

      return client
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'CONVERT', entityType: 'LEAD', entityId: leadId, metadata: { companyName: result.companyName, clientId: result.id } })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[leads/convert]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
