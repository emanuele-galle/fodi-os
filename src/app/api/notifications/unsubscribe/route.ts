import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = unsubscribeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dati non validi' }, { status: 400 })
    }

    await prisma.pushSubscription.deleteMany({
      where: { userId, endpoint: parsed.data.endpoint },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[notifications/unsubscribe]', e)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
