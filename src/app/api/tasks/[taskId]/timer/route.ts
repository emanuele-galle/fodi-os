import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/permissions'
import type { Role } from '@/generated/prisma/client'
import { z } from 'zod'

const timerActionSchema = z.object({
  action: z.enum(['start', 'stop']),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'write')

    const userId = request.headers.get('x-user-id')!
    const { taskId } = await params

    const body = await request.json()
    const parsed = timerActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { action } = parsed.data

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, projectId: true, timerStartedAt: true, timerUserId: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
    }

    if (action === 'start') {
      if (task.timerStartedAt) {
        return NextResponse.json(
          { error: 'Timer già attivo per questa task' },
          { status: 409 }
        )
      }

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: {
          timerStartedAt: new Date(),
          timerUserId: userId,
        },
      })

      return NextResponse.json({
        success: true,
        timerStartedAt: updated.timerStartedAt,
        timerUserId: updated.timerUserId,
      })
    }

    // action === 'stop'
    if (!task.timerStartedAt) {
      return NextResponse.json(
        { error: 'Nessun timer attivo per questa task' },
        { status: 409 }
      )
    }

    const startTime = new Date(task.timerStartedAt)
    const endTime = new Date()
    const diffMs = endTime.getTime() - startTime.getTime()
    const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100 // Round to 2 decimals

    // Create automatic TimeEntry
    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: task.timerUserId || userId,
        taskId,
        projectId: task.projectId,
        date: startTime,
        hours: Math.max(hours, 0.01), // Minimum 0.01h
        description: `Auto-log: timer (${task.title})`,
        billable: true,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        task: { select: { id: true, title: true } },
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: task.timerUserId || userId,
        action: 'TIMER_STOP',
        entityType: 'TimeEntry',
        entityId: timeEntry.id,
        metadata: {
          taskId,
          taskTitle: task.title,
          hours,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      },
    })

    // Reset timer on task
    await prisma.task.update({
      where: { id: taskId },
      data: {
        timerStartedAt: null,
        timerUserId: null,
      },
    })

    return NextResponse.json({
      success: true,
      timeEntry,
      hours,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const role = request.headers.get('x-user-role') as Role
    requirePermission(role, 'pm', 'read')

    const { taskId } = await params

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { timerStartedAt: true, timerUserId: true },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task non trovato' }, { status: 404 })
    }

    return NextResponse.json({
      timerStartedAt: task.timerStartedAt,
      timerUserId: task.timerUserId,
      isRunning: !!task.timerStartedAt,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore interno del server'
    if (msg.startsWith('Permission denied')) return NextResponse.json({ error: msg }, { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
