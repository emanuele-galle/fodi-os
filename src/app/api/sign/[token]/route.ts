import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySignatureToken } from '@/lib/signature-token'
import { getClientIp } from '@/lib/ip'

export async function GET(
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

    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        documentType: true,
        documentTitle: true,
        documentUrl: true,
        signedPdfUrl: true,
        signerName: true,
        signerEmail: true,
        status: true,
        expiresAt: true,
        signedAt: true,
        declineReason: true,
        message: true,
        createdAt: true,
        requester: { select: { firstName: true, lastName: true } },
        signerClient: { select: { companyName: true } },
      },
    })

    if (!signatureRequest) {
      return NextResponse.json({ error: 'Richiesta firma non trovata' }, { status: 404 })
    }

    // Check expiry
    if (new Date() > signatureRequest.expiresAt && signatureRequest.status !== 'SIGNED' && signatureRequest.status !== 'DECLINED') {
      await prisma.signatureRequest.update({ where: { id: requestId }, data: { status: 'EXPIRED' } })
      return NextResponse.json({ ...signatureRequest, status: 'EXPIRED' })
    }

    // Audit: viewed
    const ip = getClientIp(request)
    await prisma.signatureAudit.create({
      data: {
        requestId,
        action: 'viewed',
        ipAddress: ip,
        userAgent: request.headers.get('user-agent'),
      },
    })

    // Load company profile for branding
    const company = await prisma.companyProfile.findFirst({
      select: { ragioneSociale: true, partitaIva: true, indirizzo: true, cap: true, citta: true, provincia: true, pec: true, siteUrl: true, logoUrl: true },
    })

    return NextResponse.json({ ...signatureRequest, company })
  } catch (e) {
    console.error('[sign/:token]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
