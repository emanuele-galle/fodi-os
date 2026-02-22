import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { getClientIp } from '@/lib/ip'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { requestId } = await params

    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, email: true } },
        signerClient: { select: { id: true, companyName: true } },
        otpAttempts: {
          select: { id: true, channel: true, sentTo: true, expiresAt: true, isUsed: true, attempts: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        auditTrail: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!signatureRequest) {
      return NextResponse.json({ error: 'Richiesta firma non trovata' }, { status: 404 })
    }

    return NextResponse.json(signatureRequest)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[signatures/:requestId]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { requestId } = await params
    const userId = request.headers.get('x-user-id')!

    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { id: requestId },
    })

    if (!signatureRequest) {
      return NextResponse.json({ error: 'Richiesta firma non trovata' }, { status: 404 })
    }

    if (signatureRequest.status === 'SIGNED') {
      return NextResponse.json({ error: 'Non puoi annullare una richiesta gia firmata' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.signatureAudit.create({
        data: {
          requestId,
          action: 'cancelled',
          ipAddress: getClientIp(request),
          userAgent: request.headers.get('user-agent'),
          metadata: { cancelledBy: userId },
        },
      }),
      prisma.signatureRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[signatures/:requestId]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
