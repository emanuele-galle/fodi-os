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
    const { firstName, lastName, phone } = parsed.data

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
      },
    })

    return NextResponse.json({ success: true, data: user, ...user })
  } catch (error) {
    console.error('[users/me/PATCH]', error)
    return NextResponse.json({ success: false, error: 'Errore interno del server' }, { status: 500 })
  }
}
