import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

async function getUserId(request: NextRequest): Promise<string | null> {
  const fromHeader = request.headers.get('x-user-id')
  if (fromHeader) return fromHeader

  const token = request.cookies.get('fodi_access')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET)
    return payload.sub as string
  } catch {
    return null
  }
}

// GET /api/auth/google/status - Check if user has Google connected
export async function GET(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const token = await prisma.googleToken.findUnique({
    where: { userId },
    select: { email: true, scope: true, expiresAt: true, updatedAt: true },
  })

  if (!token) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({
    connected: true,
    email: token.email,
    scope: token.scope,
    expiresAt: token.expiresAt,
    lastSync: token.updatedAt,
  })
}
