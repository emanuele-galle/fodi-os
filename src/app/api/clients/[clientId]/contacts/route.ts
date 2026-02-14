import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createContactSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'read')

    const { clientId } = await params
    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: { clientId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.contact.count({ where: { clientId } }),
    ])

    return NextResponse.json({ items: contacts, total, page, limit })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
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
    const parsed = createContactSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { firstName, lastName, email, phone, role: contactRole, isPrimary } = parsed.data

    // If setting as primary, unset others first
    if (isPrimary) {
      await prisma.contact.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const contact = await prisma.contact.create({
      data: {
        clientId,
        firstName,
        lastName,
        email,
        phone,
        role: contactRole,
        isPrimary: isPrimary || false,
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
