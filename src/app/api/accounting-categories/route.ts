import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createAccountingCategorySchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const type = searchParams.get('type')

    const where = { ...(type && { type }) }

    const items = await prisma.accountingCategory.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, items })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[accounting-categories]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = createAccountingCategorySchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const category = await prisma.accountingCategory.create({ data: parsed.data })
    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[accounting-categories]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
