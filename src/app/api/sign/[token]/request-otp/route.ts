import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySignatureToken } from '@/lib/signature-token'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/signature-email'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/ip'

const MAX_OTP_PER_REQUEST = 3

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = getClientIp(request)
    if (!rateLimit(`otp-request:${ip}`, 5, 60000)) {
      return NextResponse.json({ error: 'Troppi tentativi. Riprova tra un minuto.' }, { status: 429 })
    }

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
      include: { _count: { select: { otpAttempts: true } } },
    })

    if (!signatureRequest) {
      return NextResponse.json({ error: 'Richiesta firma non trovata' }, { status: 404 })
    }

    if (signatureRequest.status === 'SIGNED' || signatureRequest.status === 'CANCELLED' || signatureRequest.status === 'DECLINED') {
      return NextResponse.json({ error: 'Richiesta non piu attiva' }, { status: 400 })
    }

    if (new Date() > signatureRequest.expiresAt) {
      await prisma.signatureRequest.update({ where: { id: requestId }, data: { status: 'EXPIRED' } })
      return NextResponse.json({ error: 'Richiesta scaduta' }, { status: 400 })
    }

    if (signatureRequest._count.otpAttempts >= MAX_OTP_PER_REQUEST) {
      return NextResponse.json({ error: 'Numero massimo di OTP raggiunto' }, { status: 429 })
    }

    const otpCode = generateOtp()
    const otpHash = await hashOtp(otpCode)
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000)

    // Load company profile for email branding
    const company = await prisma.companyProfile.findFirst({
      select: { ragioneSociale: true, partitaIva: true, indirizzo: true, cap: true, citta: true, provincia: true, pec: true, siteUrl: true, logoUrl: true },
    })

    const sent = await sendOtpEmail(signatureRequest.signerEmail, otpCode, signatureRequest.documentTitle, company)
    if (!sent) {
      return NextResponse.json({ error: 'Errore invio email OTP' }, { status: 500 })
    }

    await prisma.signatureOtp.create({
      data: {
        requestId,
        otpHash,
        channel: 'email',
        sentTo: signatureRequest.signerEmail,
        expiresAt: otpExpires,
      },
    })

    if (signatureRequest.status === 'PENDING') {
      await prisma.signatureRequest.update({
        where: { id: requestId },
        data: { status: 'OTP_SENT' },
      })
    }

    await prisma.signatureAudit.create({
      data: {
        requestId,
        action: 'otp_sent',
        ipAddress: ip,
        userAgent: request.headers.get('user-agent'),
        metadata: { channel: 'email', sentTo: signatureRequest.signerEmail },
      },
    })

    // Return masked email
    const email = signatureRequest.signerEmail
    const [local, domain] = email.split('@')
    const masked = local.substring(0, 2) + '***@' + domain

    return NextResponse.json({ success: true, maskedEmail: masked })
  } catch (e) {
    console.error('[sign/:token/request-otp]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
