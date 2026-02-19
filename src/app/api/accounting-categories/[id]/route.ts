import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { updateAccountingCategorySchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')
    const { id } = await params

    const existing = await prisma.accountingCategory.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Categoria non trovata' }, { status: 404 })

    const body = await request.json()
    const parsed = updateAccountingCategorySchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const updated = await prisma.accountingCategory.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[accounting-category-update]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'delete')
    const { id } = await params

    const existing = await prisma.accountingCategory.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Categoria non trovata' }, { status: 404 })

    await prisma.accountingCategory.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[accounting-category-delete]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
