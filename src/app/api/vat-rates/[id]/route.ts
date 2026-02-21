import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { z } from 'zod'

const updateVatRateSchema = z.object({
  rate: z.number().min(0).max(100).optional(),
  label: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
}).partial()

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')
    const { id } = await params

    const existing = await prisma.vatRate.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Aliquota non trovata' }, { status: 404 })

    const body = await request.json()
    const parsed = updateVatRateSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    if (parsed.data.isDefault) {
      await prisma.vatRate.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
    }

    const updated = await prisma.vatRate.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[vat-rate-update]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'delete')
    const { id } = await params

    const existing = await prisma.vatRate.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Aliquota non trovata' }, { status: 404 })

    await prisma.vatRate.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[vat-rate-delete]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
