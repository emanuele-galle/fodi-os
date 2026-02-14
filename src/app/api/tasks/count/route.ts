import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const count = await prisma.task.count({
      where: {
        assignments: { some: { userId } },
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    console.error('[tasks/count]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
