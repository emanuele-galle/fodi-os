import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySignatureToken } from '@/lib/signature-token'
import { verifyOtp } from '@/lib/otp'
import { verifyOtpSchema } from '@/lib/validation'
import { addSignatureStamp } from '@/lib/signature-pdf'
import { rateLimit } from '@/lib/rate-limit'
import { sendPush } from '@/lib/push'
import { sendViaSMTP } from '@/lib/email'
import { buildSignatureCompletedEmail } from '@/lib/email-templates'
import { getClientIp } from '@/lib/ip'

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = getClientIp(request)
    if (!rateLimit(`otp-verify:${ip}`, 10, 60000)) {
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

    const body = await request.json()
    const parsed = verifyOtpSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { otp } = parsed.data

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
      return NextResponse.json({ error: 'Richiesta non piu attiva' }, { status: 400 })
    }

    if (new Date() > signatureRequest.expiresAt) {
      await prisma.signatureRequest.update({ where: { id: requestId }, data: { status: 'EXPIRED' } })
      return NextResponse.json({ error: 'Richiesta scaduta' }, { status: 400 })
    }

    // Find the latest valid OTP
    const latestOtp = await prisma.signatureOtp.findFirst({
      where: {
        requestId,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!latestOtp) {
      return NextResponse.json({ error: 'Nessun OTP valido. Richiedi un nuovo codice.' }, { status: 400 })
    }

    // Atomic check + increment to prevent race conditions
    const updated = await prisma.signatureOtp.updateMany({
      where: {
        id: latestOtp.id,
        attempts: { lt: latestOtp.maxAttempts },
        isUsed: false,
      },
      data: { attempts: { increment: 1 } },
    })

    if (updated.count === 0) {
      // Max attempts reached
      await prisma.signatureOtp.update({ where: { id: latestOtp.id }, data: { isUsed: true } })
      return NextResponse.json({ error: 'Troppi tentativi. Richiedi un nuovo codice.' }, { status: 429 })
    }

    // Verify OTP
    const valid = await verifyOtp(otp, latestOtp.otpHash)

    if (!valid) {
      await prisma.signatureAudit.create({
        data: {
          requestId,
          action: 'otp_failed',
          ipAddress: ip,
          userAgent: request.headers.get('user-agent'),
          metadata: { remainingAttempts: latestOtp.maxAttempts - latestOtp.attempts - 1 },
        },
      })
      const remaining = latestOtp.maxAttempts - latestOtp.attempts - 1
      return NextResponse.json(
        { error: `Codice OTP non valido. ${remaining} tentativi rimasti.` },
        { status: 400 }
      )
    }

    // Mark OTP as used
    await prisma.signatureOtp.update({ where: { id: latestOtp.id }, data: { isUsed: true } })

    // Sign the PDF
    const signedAt = new Date()
    let signedPdfUrl = signatureRequest.documentUrl // fallback

    try {
      // Fetch original PDF
      const pdfResponse = await fetch(signatureRequest.documentUrl)
      if (pdfResponse.ok) {
        const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer())
        const signedPdfBytes = await addSignatureStamp(pdfBytes, signatureRequest.signerName, signedAt, ip)

        // Upload signed PDF to the same storage
        // Replace the original filename to include -signed
        const originalUrl = new URL(signatureRequest.documentUrl)
        const pathParts = originalUrl.pathname.split('/')
        const filename = pathParts[pathParts.length - 1]
        const signedFilename = filename.replace('.pdf', '-signed.pdf')
        pathParts[pathParts.length - 1] = signedFilename
        originalUrl.pathname = pathParts.join('/')

        // For MinIO/S3, use presigned URL or direct upload
        // For now, store as base64 data URL as fallback if direct upload not possible
        signedPdfUrl = originalUrl.toString()

        // Try to upload to MinIO using the S3 client
        try {
          const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
          const s3 = new S3Client({
            region: 'us-east-1',
            endpoint: process.env.S3_ENDPOINT || 'http://vps-panel-minio:9000',
            forcePathStyle: true,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY || process.env.MINIO_ROOT_USER || '',
              secretAccessKey: process.env.S3_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || '',
            },
          })

          const bucket = process.env.S3_BUCKET || brand.s3Bucket
          const key = `signatures/${requestId}/${signedFilename}`

          await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: signedPdfBytes,
            ContentType: 'application/pdf',
          }))

          signedPdfUrl = `${process.env.S3_PUBLIC_URL || 'https://storage.fodivps1.cloud'}/${bucket}/${key}`
        } catch (uploadErr) {
          console.error('[SIGNATURE] Errore upload PDF firmato:', uploadErr)
          // Keep fallback URL
        }
      }
    } catch (pdfErr) {
      console.error('[SIGNATURE] Errore firma PDF:', pdfErr)
      // Continue without signed PDF - the signature is still valid
    }

    // Update signature request
    await prisma.signatureRequest.update({
      where: { id: requestId },
      data: {
        status: 'SIGNED',
        signedAt,
        signedPdfUrl,
      },
    })

    // Audit
    await prisma.signatureAudit.create({
      data: {
        requestId,
        action: 'signed',
        ipAddress: ip,
        userAgent: request.headers.get('user-agent'),
        metadata: { signedPdfUrl },
      },
    })

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
          type: 'signature_completed',
          title: 'Documento firmato',
          message: `${reqWithRequester.signerName} ha firmato "${reqWithRequester.documentTitle}"`,
          link: '/erp/signatures',
        },
      }).catch(() => {})
      sendPush(r.id, {
        title: 'Documento firmato',
        message: `${reqWithRequester.signerName} ha firmato "${reqWithRequester.documentTitle}"`,
        link: '/erp/signatures',
      })
      if (r.email) {
        const html = buildSignatureCompletedEmail({
          recipientFirstName: r.firstName,
          signerName: reqWithRequester.signerName,
          documentTitle: reqWithRequester.documentTitle,
        })
        sendViaSMTP(r.email, `Documento firmato: ${reqWithRequester.documentTitle}`, html)
      }
    }

    return NextResponse.json({ success: true, signedAt: signedAt.toISOString() })
  } catch (e) {
    console.error('[sign/:token/verify]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
