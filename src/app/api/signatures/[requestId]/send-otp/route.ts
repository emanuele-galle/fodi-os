import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { generateOtp, hashOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/signature-email'
import type { Role } from '@/generated/prisma/client'

const MAX_OTP_PER_REQUEST = 3

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const { requestId } = await params

    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { id: requestId },
      include: { _count: { select: { otpAttempts: true } } },
    })

    if (!signatureRequest) {
      return NextResponse.json({ error: 'Richiesta firma non trovata' }, { status: 404 })
    }

    if (signatureRequest.status === 'SIGNED' || signatureRequest.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Richiesta non piu attiva' }, { status: 400 })
    }

    if (new Date() > signatureRequest.expiresAt) {
      await prisma.signatureRequest.update({ where: { id: requestId }, data: { status: 'EXPIRED' } })
      return NextResponse.json({ error: 'Richiesta scaduta' }, { status: 400 })
    }

    if (signatureRequest._count.otpAttempts >= MAX_OTP_PER_REQUEST) {
      return NextResponse.json({ error: 'Numero massimo di OTP raggiunto per questa richiesta' }, { status: 429 })
    }

    // Generate and hash OTP
    const otpCode = generateOtp()
    const otpHash = await hashOtp(otpCode)
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Load company profile for email branding
    const company = await prisma.companyProfile.findFirst({
      select: { ragioneSociale: true, partitaIva: true, indirizzo: true, cap: true, citta: true, provincia: true, pec: true, siteUrl: true, logoUrl: true },
    })

    // Send email
    const sent = await sendOtpEmail(signatureRequest.signerEmail, otpCode, signatureRequest.documentTitle, company)
    if (!sent) {
      return NextResponse.json({ error: 'Errore invio email OTP' }, { status: 500 })
    }

    // Save OTP hash
    await prisma.signatureOtp.create({
      data: {
        requestId,
        otpHash,
        channel: 'email',
        sentTo: signatureRequest.signerEmail,
        expiresAt: otpExpires,
      },
    })

    // Update status
    if (signatureRequest.status === 'PENDING') {
      await prisma.signatureRequest.update({
        where: { id: requestId },
        data: { status: 'OTP_SENT' },
      })
    }

    // Audit
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    await prisma.signatureAudit.create({
      data: {
        requestId,
        action: 'otp_sent',
        ipAddress: ip,
        userAgent: request.headers.get('user-agent'),
        metadata: { channel: 'email', sentTo: signatureRequest.signerEmail },
      },
    })

    // Mask email for privacy
    const email = signatureRequest.signerEmail
    const [local, domain] = email.split('@')
    const maskedEmail = local.substring(0, 2) + '***@' + domain
    return NextResponse.json({ success: true, sentTo: maskedEmail })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[signatures/:requestId/send-otp]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
