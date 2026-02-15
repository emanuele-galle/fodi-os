import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { z } from 'zod'
import type { Role } from '@/generated/prisma/client'
import { createCategorySchema } from '@/lib/validation/training'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'read')

    const { searchParams } = request.nextUrl
    const type = searchParams.get('type')

    const where = {
      ...(type && { type: type as 'INTERNAL' | 'USER' }),
    }

    const categories = await prisma.trainingCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { courses: true } },
      },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/categories]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'write')

    const body = await request.json()
    const parsed = createCategorySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const category = await prisma.trainingCategory.create({
      data: parsed.data,
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/categories/POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
