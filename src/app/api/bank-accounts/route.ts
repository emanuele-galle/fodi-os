import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createBankAccountSchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const accounts = await prisma.bankAccount.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, items: accounts })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[bank-accounts]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const parsed = createBankAccountSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const account = await prisma.bankAccount.create({ data: parsed.data })
    return NextResponse.json({ success: true, data: account }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied'))
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    console.error('[bank-accounts]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
