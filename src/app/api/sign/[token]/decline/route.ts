import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySignatureToken } from '@/lib/signature-token'
import { declineSignatureSchema } from '@/lib/validation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    let requestId: string
    try {
      const payload = await verifySignatureToken(token)
      requestId = payload.requestId
    } catch {
      return NextResponse.json({ error: 'Token non valido o scaduto' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = declineSignatureSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { id: requestId },
    })

    if (!signatureRequest) {
      return NextResponse.json({ error: 'Richiesta firma non trovata' }, { status: 404 })
    }

    if (signatureRequest.status === 'SIGNED') {
      return NextResponse.json({ error: 'Documento gia firmato' }, { status: 400 })
    }

    if (signatureRequest.status === 'CANCELLED' || signatureRequest.status === 'DECLINED') {
      return NextResponse.json({ error: 'Richiesta gia chiusa' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    await prisma.$transaction([
      prisma.signatureAudit.create({
        data: {
          requestId,
          action: 'declined',
          ipAddress: ip,
          userAgent: request.headers.get('user-agent'),
          metadata: { reason: parsed.data.reason || null },
        },
      }),
      prisma.signatureRequest.update({
        where: { id: requestId },
        data: {
          status: 'DECLINED',
          declineReason: parsed.data.reason || null,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
