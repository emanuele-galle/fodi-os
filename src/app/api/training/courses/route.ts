import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role, TrainingDifficulty } from '@/generated/prisma/client'
import { createCourseSchema } from '@/lib/validation/training'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'read')

    const userId = request.headers.get('x-user-id')
    const { searchParams } = request.nextUrl
    const categoryId = searchParams.get('categoryId')
    const difficulty = searchParams.get('difficulty')
    const search = searchParams.get('search') || ''
    const isPublished = searchParams.get('isPublished')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      ...(categoryId && { categoryId }),
      ...(difficulty && { difficulty: difficulty as TrainingDifficulty }),
      ...(search && {
        title: { contains: search, mode: 'insensitive' as const },
      }),
      ...(isPublished !== null && isPublished !== undefined && {
        isPublished: isPublished === 'true',
      }),
    }

    const [items, total] = await Promise.all([
      prisma.trainingCourse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: {
          category: true,
          _count: { select: { lessons: true } },
          ...(userId ? {
            enrollments: {
              where: { userId },
              take: 1,
            },
          } : {}),
        },
      }),
      prisma.trainingCourse.count({ where }),
    ])

    return NextResponse.json({ success: true, data: items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/courses]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'training', 'write')

    const body = await request.json()
    const parsed = createCourseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const course = await prisma.trainingCourse.create({
      data: parsed.data,
    })

    return NextResponse.json({ success: true, data: course }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[training/courses/POST]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
