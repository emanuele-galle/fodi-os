import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'crm', 'write')

    const { id } = await params
    const userId = request.headers.get('x-user-id')
    const body = await request.json()
    const { status } = body

    if (!['ACCEPTED', 'DISMISSED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Status non valido' }, { status: 400 })
    }

    const suggestion = await prisma.aiSuggestion.update({
      where: { id },
      data: {
        status,
        acceptedById: status === 'ACCEPTED' ? userId : null,
      },
      select: {
        id: true,
        status: true,
        actionType: true,
        actionData: true,
        clientId: true,
      },
    })

    return NextResponse.json({ success: true, data: suggestion })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[crm/suggestions/PATCH]', e)
    return NextResponse.json({ success: false, error: 'Errore nell\'aggiornamento' }, { status: 500 })
  }
}
