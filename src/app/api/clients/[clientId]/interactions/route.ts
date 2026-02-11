import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId } = await params
    const type = request.nextUrl.searchParams.get('type')

    const interactions = await prisma.interaction.findMany({
      where: {
        clientId,
        ...(type && { type: type as never }),
      },
      orderBy: { date: 'desc' },
      include: { contact: true },
    })

    return NextResponse.json({ items: interactions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { clientId } = await params
    const body = await request.json()
    const { type, subject, content, contactId, date } = body

    if (!type || !subject) {
      return NextResponse.json({ error: 'type and subject are required' }, { status: 400 })
    }

    const interaction = await prisma.interaction.create({
      data: {
        clientId,
        type,
        subject,
        content,
        contactId,
        date: date ? new Date(date) : new Date(),
      },
      include: { contact: true },
    })

    return NextResponse.json(interaction, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
