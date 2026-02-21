import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { z } from 'zod'

const createVatRateSchema = z.object({
  rate: z.number().min(0).max(100),
  label: z.string().min(1, 'Label obbligatoria'),
  code: z.string().min(1, 'Codice obbligatorio'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
})

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const activeOnly = searchParams.get('active') !== 'false'

    const items = await prisma.vatRate.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { rate: 'asc' }],
    })

    return NextResponse.json({ success: true, items })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[vat-rates]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = createVatRateSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    // If setting as default, unset other defaults
    if (parsed.data.isDefault) {
      await prisma.vatRate.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
    }

    const vatRate = await prisma.vatRate.create({ data: parsed.data })
    return NextResponse.json({ success: true, data: vatRate }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[vat-rates]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
