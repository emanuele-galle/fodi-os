import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true },
    })

    return NextResponse.json({ completed: user?.onboardingCompleted ?? true })
  } catch (e) {
    console.error('[onboarding GET]', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    let completed = true
    try {
      const body = await request.json()
      if (body?.reset === true) completed = false
    } catch {
      // No body = mark as completed
    }

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: completed },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[onboarding PATCH]', e)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
