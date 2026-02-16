import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const manualReminderSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  link: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const reminders = await prisma.notification.findMany({
      where: {
        userId: session.sub,
        type: { in: ['reminder', 'reminder_manual'] },
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ items: reminders })
  } catch (e) {
    console.error('[reminders/GET]', e)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = manualReminderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload non valido', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const reminder = await prisma.notification.create({
      data: {
        userId: session.sub,
        type: 'reminder_manual',
        title: parsed.data.title,
        message: parsed.data.message,
        link: parsed.data.link,
      },
    })

    return NextResponse.json(reminder, { status: 201 })
  } catch (e) {
    console.error('[reminders/POST]', e)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
