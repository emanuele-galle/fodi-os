import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateContactSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ clientId: string; contactId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { clientId, contactId } = await params

    // Verify contact exists and belongs to client
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, clientId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contatto non trovato' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updateContactSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { firstName, lastName, email, phone, role: contactRole, isPrimary, notes } = parsed.data

    // If setting as primary, unset others first
    if (isPrimary) {
      await prisma.contact.updateMany({
        where: { clientId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone }),
        ...(contactRole !== undefined && { role: contactRole }),
        ...(isPrimary !== undefined && { isPrimary }),
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json({ success: true, data: contact })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/contacts/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ clientId: string; contactId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'delete')

    const { clientId, contactId } = await params

    // Verify contact exists and belongs to client
    const existing = await prisma.contact.findFirst({
      where: { id: contactId, clientId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Contatto non trovato' }, { status: 404 })
    }

    await prisma.contact.delete({ where: { id: contactId } })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[clients/contacts/DELETE]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
