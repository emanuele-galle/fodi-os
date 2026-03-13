import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeNextRunAt, isRuleExhausted } from '@/lib/recurrence-utils'
import { logger } from '@/lib/logger'
import { sendDataChanged } from '@/lib/sse'

const CRON_SECRET = process.env.CRON_SECRET

async function generateInstanceForRule(rule: Awaited<ReturnType<typeof prisma.recurrenceRule.findFirst>> & { task: { id: string; title: string; description: string | null; priority: string; projectId: string | null; folderId: string | null; clientId: string | null; creatorId: string | null; isPersonal: boolean; tags: string[]; taskType: string | null; assignments: { userId: string; role: string }[] } }) {
  if (!rule) return null

  const { task } = rule

  // Check idempotency — don't generate if already generated today
  if (rule.lastGeneratedAt) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastGen = new Date(rule.lastGeneratedAt)
    lastGen.setHours(0, 0, 0, 0)
    if (lastGen.getTime() === today.getTime()) {
      logger.info(`[recurring] Rule ${rule.id} already generated today, skipping`)
      return null
    }
  }

  // Create instance in transaction
  const instance = await prisma.$transaction(async (tx) => {
    const newTask = await tx.task.create({
      data: {
        title: task.title,
        description: task.description,
        priority: task.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        projectId: task.projectId,
        folderId: task.folderId,
        clientId: task.clientId,
        creatorId: task.creatorId ?? '',
        isPersonal: task.isPersonal,
        tags: task.tags,
        taskType: task.taskType,
        status: 'TODO',
        boardColumn: 'todo',
        recurrenceTemplateId: task.id,
        assigneeId: task.assignments[0]?.userId ?? task.creatorId ?? '',
      },
    })

    // Copy assignments
    if (task.assignments.length > 0) {
      await tx.taskAssignment.createMany({
        data: task.assignments.map((a) => ({
          taskId: newTask.id,
          userId: a.userId,
          role: a.role,
          assignedBy: task.creatorId ?? '',
        })),
        skipDuplicates: true,
      })
    }

    // Calculate next run
    const nextRunAt = computeNextRunAt({
      frequency: rule.frequency,
      interval: rule.interval,
      weekDays: rule.weekDays,
      monthDay: rule.monthDay,
      startDate: rule.startDate,
      endDate: rule.endDate,
      maxOccurrences: rule.maxOccurrences,
      occurrenceCount: rule.occurrenceCount + 1,
    }, new Date())

    // Update rule
    await tx.recurrenceRule.update({
      where: { id: rule.id },
      data: {
        occurrenceCount: { increment: 1 },
        lastGeneratedAt: new Date(),
        ...(nextRunAt ? { nextRunAt } : { isActive: false }),
      },
    })

    return newTask
  })

  // SSE notification (outside transaction)
  const assigneeIds = task.assignments.map((a) => a.userId)
  if (assigneeIds.length > 0) {
    sendDataChanged(assigneeIds, 'task', instance.id)
  }

  return instance
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization')
    if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const now = new Date()
    const rules = await prisma.recurrenceRule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        task: {
          include: {
            assignments: { select: { userId: true, role: true } },
          },
        },
      },
      take: 100,
    })

    let generated = 0
    let exhausted = 0
    const errors: string[] = []

    for (const rule of rules) {
      try {
        if (isRuleExhausted({
          maxOccurrences: rule.maxOccurrences,
          occurrenceCount: rule.occurrenceCount,
          endDate: rule.endDate,
        })) {
          await prisma.recurrenceRule.update({
            where: { id: rule.id },
            data: { isActive: false },
          })
          exhausted++
          continue
        }

        const instance = await generateInstanceForRule(rule)
        if (instance) generated++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(`[recurring] Failed to generate for rule ${rule.id}`, { error: msg })
        errors.push(`Rule ${rule.id}: ${msg}`)
      }
    }

    logger.info(`[recurring] Generated ${generated} tasks, ${exhausted} exhausted, ${errors.length} errors`)
    return NextResponse.json({ success: true, generated, exhausted, errors: errors.length, checked: rules.length })
  } catch (e) {
    logger.error('[recurring] Fatal error', { error: e instanceof Error ? e.message : String(e) })
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
