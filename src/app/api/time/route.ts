import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { createTimeEntrySchema, updateTimeEntrySchema } from '@/lib/validation'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      ...(userId && { userId }),
      ...(projectId && { projectId }),
      ...(from || to
        ? {
            date: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
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

    return NextResponse.json({ items, total, page, limit })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[time]', e)
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
          taskTitle: entry.task?.title || null,
          projectId: projectId || null,
          description: description || null,
        },
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[time]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const userId = request.headers.get('x-user-id')!
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Parametro id mancante' }, { status: 400 })
    }

    const existing = await prisma.timeEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Time entry non trovata' }, { status: 404 })
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'Puoi modificare solo le tue registrazioni' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateTimeEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.hours !== undefined) data.hours = parsed.data.hours
    if (parsed.data.description !== undefined) data.description = parsed.data.description
    if (parsed.data.billable !== undefined) data.billable = parsed.data.billable
    if (parsed.data.hourlyRate !== undefined) data.hourlyRate = parsed.data.hourlyRate
    if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date)
    if (parsed.data.taskId !== undefined) data.taskId = parsed.data.taskId
    if (parsed.data.projectId !== undefined) data.projectId = parsed.data.projectId

    const entry = await prisma.timeEntry.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        task: { select: { id: true, title: true, project: { select: { id: true, name: true } } } },
      },
    })

    return NextResponse.json(entry)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[time]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const userId = request.headers.get('x-user-id')!
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Parametro id mancante' }, { status: 400 })
    }

    const existing = await prisma.timeEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Time entry non trovata' }, { status: 404 })
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'Puoi eliminare solo le tue registrazioni' }, { status: 403 })
    }

    await prisma.timeEntry.delete({ where: { id } })

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'DELETE',
        entityType: 'TimeEntry',
        entityId: id,
        metadata: { hours: existing.hours, taskId: existing.taskId, description: existing.description },
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Permission denied')) {
      return NextResponse.json({ success: false, error: e.message }, { status: 403 })
    }
    console.error('[time]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
