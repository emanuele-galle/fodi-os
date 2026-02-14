import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createInteractionSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId } = await params
    const { searchParams } = request.nextUrl
    const type = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const where = {
      clientId,
      ...(type && { type: type as never }),
    }

    const [interactions, total] = await Promise.all([
      prisma.interaction.findMany({
        where,
        orderBy: { date: 'desc' },
        include: { contact: true },
        skip,
        take: limit,
      }),
      prisma.interaction.count({ where }),
    ])

    return NextResponse.json({ success: true, data: interactions, items: interactions, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/interactions/GET]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { clientId } = await params

    // Verify client exists
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } })
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente non trovato' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = createInteractionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { type, subject, content, contactId, date } = parsed.data

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

    return NextResponse.json({ success: true, data: interaction }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/interactions/POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
