import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createTimeEntrySchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const taskId = searchParams.get('taskId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      ...(userId && { userId }),
      ...(projectId && { projectId }),
      ...(taskId && { taskId }),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          task: { select: { id: true, title: true, project: { select: { id: true, name: true } } } },
        },
      }),
      prisma.timeEntry.count({ where }),
    ])

    return NextResponse.json({ success: true, data: items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[time-entries]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const parsed = createTimeEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { taskId, projectId, date, hours, description, billable, hourlyRate } = parsed.data

    const entry = await prisma.timeEntry.create({
      data: {
        userId,
        taskId,
        projectId,
        date: new Date(date),
        hours,
        description,
        billable: billable ?? true,
        hourlyRate,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        task: { select: { id: true, title: true } },
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'TimeEntry',
        entityId: entry.id,
        metadata: {
          hours,
          taskId: taskId || null,
          projectId: projectId || null,
          description: description || null,
        },
      },
    })

    return NextResponse.json({ success: true, data: entry }, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[time-entries]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
