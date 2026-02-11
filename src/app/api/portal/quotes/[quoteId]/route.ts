import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'portal', 'read')

    const { quoteId } = await params

    // Find client linked to this portal user
    const client = await prisma.client.findUnique({
      where: { portalUserId: userId },
    })

    if (!client) {
      return NextResponse.json({ error: 'No client linked to this portal user' }, { status: 404 })
    }

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        project: { select: { id: true, name: true } },
      },
    })

    if (!quote || quote.clientId !== client.id) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    return NextResponse.json(quote)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ quoteId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    const userId = request.headers.get('x-user-id')!
    requirePermission(role, 'portal', 'write')

    const { quoteId } = await params

    // Find client linked to this portal user
    const client = await prisma.client.findUnique({
      where: { portalUserId: userId },
    })

    if (!client) {
      return NextResponse.json({ error: 'No client linked to this portal user' }, { status: 404 })
    }

    const quote = await prisma.quote.findUnique({ where: { id: quoteId } })
    if (!quote || quote.clientId !== client.id) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const body = await request.json()
    const { clientApproval, clientApprovalNote } = body

    if (clientApproval === undefined) {
      return NextResponse.json({ error: 'clientApproval is required (true=approve, false=reject)' }, { status: 400 })
    }

    const updated = await prisma.quote.update({
      where: { id: quoteId },
      data: {
        clientApproval,
        clientApprovalNote: clientApprovalNote || null,
        clientApprovalDate: new Date(),
        ...(clientApproval ? { status: 'APPROVED', approvedAt: new Date() } : { status: 'REJECTED', rejectedAt: new Date() }),
      },
    })

    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
