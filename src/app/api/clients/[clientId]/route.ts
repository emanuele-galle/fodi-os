import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { updateClientSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId } = await params

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contacts: { orderBy: { isPrimary: 'desc' } },
        interactions: { orderBy: { date: 'desc' }, take: 10, include: { contact: true } },
        projects: { orderBy: { createdAt: 'desc' }, select: { id: true, name: true, status: true } },
        quotes: { orderBy: { createdAt: 'desc' }, select: { id: true, number: true, title: true, status: true, total: true } },
        _count: { select: { contacts: true, projects: true, quotes: true } },
      },
    })

    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: client, ...client })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { clientId } = await params
    const body = await request.json()
    const parsed = updateClientSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Check client exists
    const existing = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
    }

    const { companyName, vatNumber, fiscalCode, pec, sdi, website, industry, source, status, notes, tags } = parsed.data

    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(companyName !== undefined && { companyName }),
        ...(vatNumber !== undefined && { vatNumber }),
        ...(fiscalCode !== undefined && { fiscalCode }),
        ...(pec !== undefined && { pec }),
        ...(sdi !== undefined && { sdi }),
        ...(website !== undefined && { website }),
        ...(industry !== undefined && { industry }),
        ...(source !== undefined && { source }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(tags !== undefined && { tags }),
      },
      include: {
        _count: { select: { contacts: true, projects: true, quotes: true } },
      },
    })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'UPDATE', entityType: 'CLIENT', entityId: clientId, metadata: { companyName: client.companyName } })

    return NextResponse.json({ success: true, data: client })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'delete')

    const { clientId } = await params

    // Check client exists
    const existing = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
    }

    await prisma.client.delete({ where: { id: clientId } })

    const userId = request.headers.get('x-user-id')!
    logActivity({ userId, action: 'DELETE', entityType: 'CLIENT', entityId: clientId })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
