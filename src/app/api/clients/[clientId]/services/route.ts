import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ clientId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId } = await params
    const services = await prisma.clientService.findMany({
      where: { clientId },
      include: { service: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: services })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Errore' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { clientId } = await params
    const body = await request.json()
    const clientService = await prisma.clientService.create({
      data: {
        clientId,
        serviceId: body.serviceId,
        status: body.status || 'ACTIVE',
        startDate: body.startDate ? new Date(body.startDate) : null,
        value: body.value || null,
        notes: body.notes || null,
      },
      include: { service: true },
    })
    return NextResponse.json({ success: true, data: clientService })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: 'Errore' }, { status: 500 })
  }
}
