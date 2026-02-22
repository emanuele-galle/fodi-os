import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateProfileSchema } from '@/lib/validation'

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')!
    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validazione fallita', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    const { firstName, lastName, username, phone, bio, timezone, language, dailyDigest, workSchedule } = parsed.data

    // Check username uniqueness if changed
    if (username !== undefined) {
      const existing = await prisma.user.findFirst({
        where: { username, id: { not: userId } },
        select: { id: true },
      })
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Username già in uso', field: 'username' },
          { status: 409 }
        )
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(username !== undefined && { username }),
        ...(phone !== undefined && { phone }),
        ...(bio !== undefined && { bio }),
        ...(timezone !== undefined && { timezone }),
        ...(language !== undefined && { language }),
        ...(dailyDigest !== undefined && { dailyDigest }),
        ...(workSchedule !== undefined && { workSchedule }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        bio: true,
        timezone: true,
        language: true,
        dailyDigest: true,
        workSchedule: true,
      },
    })

    return NextResponse.json({ success: true, data: user, ...user })
  } catch (error) {
    console.error('[users/me/PATCH]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
