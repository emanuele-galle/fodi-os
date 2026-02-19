import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'read')

    const { searchParams } = request.nextUrl
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const goals = await prisma.profitGoal.findMany({
      where: { year },
      orderBy: { month: 'asc' },
    })

    return NextResponse.json({ success: true, items: goals })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[profit-goals]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const { year, month, amount } = body

    if (!year || !month || amount === undefined) {
      return NextResponse.json({ success: false, error: 'year, month e amount sono obbligatori' }, { status: 400 })
    }

    if (month < 1 || month > 12) {
      return NextResponse.json({ success: false, error: 'month deve essere tra 1 e 12' }, { status: 400 })
    }

    const goal = await prisma.profitGoal.upsert({
      where: { year_month: { year, month } },
      update: { amount },
      create: { year, month, amount },
    })

    return NextResponse.json({ success: true, data: goal })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[profit-goals]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'erp', 'write')

    const body = await request.json()
    const { year, month, amount } = body

    if (!year || !month || amount === undefined) {
      return NextResponse.json({ success: false, error: 'year, month e amount sono obbligatori' }, { status: 400 })
    }

    const goal = await prisma.profitGoal.upsert({
      where: { year_month: { year, month } },
      update: { amount },
      create: { year, month, amount },
    })

    return NextResponse.json({ success: true, data: goal })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[profit-goals]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
