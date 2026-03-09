import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import { recurrenceRuleSchema } from '@/lib/validation/tasks'
import { computeNextRunAt } from '@/lib/recurrence-utils'
import { handleApiError } from '@/lib/api-error'
import type { Role } from '@/generated/prisma/client'

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')
    const { taskId } = await params

    const rule = await prisma.recurrenceRule.findUnique({ where: { taskId } })
    if (!rule) {
      return NextResponse.json({ success: false, error: 'Nessuna ricorrenza configurata' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: rule })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')
    const { taskId } = await params

    const body = await request.json()
    const parsed = recurrenceRuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Verify task exists
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } })
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task non trovato' }, { status: 404 })
    }

    const { frequency, interval, weekDays, monthDay, startDate, endDate, maxOccurrences } = parsed.data
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : null

    const nextRunAt = computeNextRunAt({
      frequency, interval, weekDays, monthDay: monthDay ?? null,
      startDate: start, endDate: end,
      maxOccurrences: maxOccurrences ?? null, occurrenceCount: 0,
    }, start)

    if (!nextRunAt) {
      return NextResponse.json({ success: false, error: 'Impossibile calcolare la prossima esecuzione' }, { status: 400 })
    }

    const rule = await prisma.recurrenceRule.upsert({
      where: { taskId },
      create: {
        taskId,
        frequency,
        interval,
        weekDays,
        monthDay: monthDay ?? null,
        startDate: start,
        endDate: end,
        maxOccurrences: maxOccurrences ?? null,
        nextRunAt,
      },
      update: {
        frequency,
        interval,
        weekDays,
        monthDay: monthDay ?? null,
        startDate: start,
        endDate: end,
        maxOccurrences: maxOccurrences ?? null,
        nextRunAt,
        isActive: true,
        occurrenceCount: 0,
        lastGeneratedAt: null,
      },
    })

    return NextResponse.json({ success: true, data: rule }, { status: 201 })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')
    const { taskId } = await params

    const existing = await prisma.recurrenceRule.findUnique({ where: { taskId } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Nessuna ricorrenza configurata' }, { status: 404 })
    }

    const body = await request.json()

    // Allow simple pause/resume
    if (body.isActive !== undefined && Object.keys(body).length === 1) {
      const rule = await prisma.recurrenceRule.update({
        where: { taskId },
        data: { isActive: body.isActive },
      })
      return NextResponse.json({ success: true, data: rule })
    }

    const parsed = recurrenceRuleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { frequency, interval, weekDays, monthDay, startDate, endDate, maxOccurrences, isActive } = parsed.data
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : null

    const nextRunAt = computeNextRunAt({
      frequency, interval, weekDays, monthDay: monthDay ?? null,
      startDate: start, endDate: end,
      maxOccurrences: maxOccurrences ?? null, occurrenceCount: existing.occurrenceCount,
    }, existing.lastGeneratedAt ?? start)

    const rule = await prisma.recurrenceRule.update({
      where: { taskId },
      data: {
        frequency,
        interval,
        weekDays,
        monthDay: monthDay ?? null,
        startDate: start,
        endDate: end,
        maxOccurrences: maxOccurrences ?? null,
        isActive: isActive ?? existing.isActive,
        ...(nextRunAt ? { nextRunAt } : {}),
      },
    })

    return NextResponse.json({ success: true, data: rule })
  } catch (e) {
    return handleApiError(e)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')
    const { taskId } = await params

    await prisma.recurrenceRule.delete({ where: { taskId } }).catch(() => null)
    return NextResponse.json({ success: true })
  } catch (e) {
    return handleApiError(e)
  }
}
