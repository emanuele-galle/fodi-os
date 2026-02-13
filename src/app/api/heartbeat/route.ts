import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
