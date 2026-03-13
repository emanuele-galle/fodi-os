import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { sendViaSMTP } from '@/lib/email'
import type { Role } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')
    requirePermission(role, 'crm', 'write')

    const body = await request.json()
    const { clientId, contactId, contactEmail, subject, bodyHtml, scenario, templateId } = body

    if (!clientId || !contactEmail || !subject || !bodyHtml) {
      return NextResponse.json(
        { success: false, error: 'clientId, contactEmail, subject e bodyHtml sono obbligatori' },
        { status: 400 },
      )
    }

    // Send via SMTP
    const sent = await sendViaSMTP(contactEmail, subject, bodyHtml)

    // Create CampaignSend record
    const campaignSend = await prisma.campaignSend.create({
      data: {
        campaignName: `manual-${scenario || 'custom'}`,
        clientId,
        contactId: contactId || null,
        contactEmail,
        subject,
        bodyHtml,
        scenario: scenario || null,
        templateId: templateId || null,
        status: sent ? 'SENT' : 'FAILED',
        sentAt: sent ? new Date() : null,
        sentById: userId || null,
      },
    })

    // Log interaction
    await prisma.interaction.create({
      data: {
        clientId,
        contactId: contactId || null,
        type: 'EMAIL',
        subject: `Email inviata: ${subject}`,
        content: `Destinatario: ${contactEmail} | Scenario: ${scenario || 'custom'} | Stato: ${sent ? 'INVIATA' : 'FALLITA'}`,
      },
    })

    return NextResponse.json({
      success: true,
      data: { id: campaignSend.id, status: campaignSend.status, sentAt: campaignSend.sentAt },
    })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/email-send]', e)
    return NextResponse.json({ success: false, error: 'Errore nell\'invio email' }, { status: 500 })
  }
}
