import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createSignatureRequestSchema } from '@/lib/validation'
import { createSignatureToken } from '@/lib/signature-token'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const search = searchParams.get('search') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { documentTitle: { contains: search, mode: 'insensitive' as const } },
          { signerName: { contains: search, mode: 'insensitive' as const } },
          { signerEmail: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [items, total] = await Promise.all([
      prisma.signatureRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, firstName: true, lastName: true } },
          signerClient: { select: { id: true, companyName: true } },
          _count: { select: { otpAttempts: true, auditTrail: true } },
        },
      }),
      prisma.signatureRequest.count({ where }),
    ])

    return NextResponse.json({ items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[signatures]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const parsed = createSignatureRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { documentType, documentId, documentTitle, documentUrl, signerName, signerEmail, signerPhone, signerClientId, message, expiresInDays } = parsed.data

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Create a placeholder token, will be updated after creation
    const tempToken = crypto.randomUUID()

    const signatureRequest = await prisma.signatureRequest.create({
      data: {
        documentType,
        documentId,
        documentTitle,
        documentUrl,
        requesterId: userId,
        signerName,
        signerEmail,
        signerPhone,
        signerClientId,
        message,
        expiresAt,
        accessToken: tempToken,
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        signerClient: { select: { id: true, companyName: true } },
      },
    })

    // Generate JWT access token and update
    const accessToken = await createSignatureToken(signatureRequest.id)
    await prisma.signatureRequest.update({
      where: { id: signatureRequest.id },
      data: { accessToken },
    })

    // Create audit trail entry
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    await prisma.signatureAudit.create({
      data: {
        requestId: signatureRequest.id,
        action: 'created',
        ipAddress: ip,
        userAgent: request.headers.get('user-agent'),
        metadata: { createdBy: userId },
      },
    })

    return NextResponse.json({ ...signatureRequest, accessToken }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[signatures]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
