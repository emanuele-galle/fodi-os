import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySignatureToken } from '@/lib/signature-token'
import { declineSignatureSchema } from '@/lib/validation'
import { sendPush } from '@/lib/push'
import { sendViaSMTP } from '@/lib/email'

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

    // Notify requester
    const reqWithRequester = await prisma.signatureRequest.findUnique({
      where: { id: requestId },
      select: {
        documentTitle: true,
        signerName: true,
        requesterId: true,
        requester: { select: { id: true, email: true, firstName: true } },
      },
    })
    if (reqWithRequester?.requester) {
      const r = reqWithRequester.requester
      prisma.notification.create({
        data: {
          userId: r.id,
          type: 'signature_declined',
          title: 'Firma rifiutata',
          message: `${reqWithRequester.signerName} ha rifiutato di firmare "${reqWithRequester.documentTitle}"`,
          link: '/erp/signatures',
        },
      }).catch(() => {})
      sendPush(r.id, {
        title: 'Firma rifiutata',
        message: `${reqWithRequester.signerName} ha rifiutato di firmare "${reqWithRequester.documentTitle}"`,
        link: '/erp/signatures',
      })
      if (r.email) {
        sendViaSMTP(
          r.email,
          `Firma rifiutata: ${reqWithRequester.documentTitle}`,
          `<p>Ciao ${r.firstName},</p><p><strong>${reqWithRequester.signerName}</strong> ha rifiutato di firmare il documento "${reqWithRequester.documentTitle}".</p>${parsed.data.reason ? `<p><strong>Motivo:</strong> ${parsed.data.reason}</p>` : ''}<p>Puoi visualizzare i dettagli nella sezione <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://os.fodisrl.it'}/erp/signatures">Firme</a>.</p>`
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[sign/:token/decline]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
