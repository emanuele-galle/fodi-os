import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { timingSafeEqual } from 'crypto'

const webhookSecret = process.env.N8N_WEBHOOK_SECRET

const notificationPayload = z.object({
  type: z.literal('notification'),
  userId: z.string().uuid(),
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().optional(),
})

const taskUpdatePayload = z.object({
  type: z.literal('task_update'),
  taskId: z.string().uuid(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']),
  metadata: z.any().optional(),
})

const clientUpdatePayload = z.object({
  type: z.literal('client_update'),
  clientId: z.string().uuid(),
  status: z.enum(['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED']).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const webhookPayload = z.union([
  notificationPayload,
  taskUpdatePayload,
  clientUpdatePayload,
])

export async function POST(request: NextRequest) {
  try {
    if (!webhookSecret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    const secret = request.headers.get('x-n8n-secret')
    if (!secret || !timingSafeCompare(secret, webhookSecret)) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = webhookPayload.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload non valido', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data

    switch (data.type) {
      case 'notification': {
        await prisma.notification.create({
          data: {
            userId: data.userId,
            type: 'n8n_webhook',
            title: data.title,
            message: data.message,
            link: data.link,
          },
        })
        break
      }

      case 'task_update': {
        const COLUMN_MAP: Record<string, string> = {
          TODO: 'todo',
          IN_PROGRESS: 'in_progress',
          IN_REVIEW: 'in_review',
          DONE: 'done',
          CANCELLED: 'done',
        }
        await prisma.task.update({
          where: { id: data.taskId },
          data: {
            status: data.status,
            boardColumn: COLUMN_MAP[data.status] || 'todo',
            ...(data.status === 'DONE' && { completedAt: new Date() }),
          },
        })
        break
      }

      case 'client_update': {
        const updateData: Record<string, unknown> = {}
        if (data.status) updateData.status = data.status
        if (data.notes) updateData.notes = data.notes
        if (data.tags) updateData.tags = data.tags
        await prisma.client.update({
          where: { id: data.clientId },
          data: updateData,
        })
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    console.error('[webhooks/n8n]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
