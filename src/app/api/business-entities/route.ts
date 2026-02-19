import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createBusinessEntitySchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const items = await prisma.businessEntity.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, items })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[business-entities]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = createBusinessEntitySchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const entity = await prisma.businessEntity.create({ data: parsed.data })
    return NextResponse.json({ success: true, data: entity }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[business-entities]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
