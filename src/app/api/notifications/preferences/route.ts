import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { clearPrefCache } from '@/lib/notifications'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!

    const prefs = await prisma.notificationPreference.findMany({
      where: { userId },
      select: { type: true, channel: true, enabled: true },
    })

    return NextResponse.json({ items: prefs })
  } catch (e) {
    console.error('[notifications/preferences GET]', e)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}

const updateSchema = z.object({
  preferences: z.array(z.object({
    type: z.string(),
    channel: z.enum(['in_app', 'push']),
    enabled: z.boolean(),
  })),
})

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    // Upsert each preference
    for (const pref of parsed.data.preferences) {
      await prisma.notificationPreference.upsert({
        where: {
          userId_type_channel: { userId, type: pref.type, channel: pref.channel },
        },
        create: { userId, type: pref.type, channel: pref.channel, enabled: pref.enabled },
        update: { enabled: pref.enabled },
      })
    }

    // Clear cache
    clearPrefCache(userId)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[notifications/preferences PUT]', e)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
