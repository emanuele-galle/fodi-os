import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { createOAuth2Client } from '@/lib/google'

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

// POST /api/auth/google/disconnect - Revoke and remove Google connection
export async function POST(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const tokenRecord = await prisma.googleToken.findUnique({ where: { userId } })
  if (!tokenRecord) {
    return NextResponse.json({ error: 'Non connesso a Google' }, { status: 400 })
  }

  // Try to revoke the token at Google
  try {
    const client = createOAuth2Client()
    await client.revokeToken(tokenRecord.accessToken)
  } catch {
    // Ignore revoke errors - token might already be invalid
  }

  await prisma.googleToken.delete({ where: { userId } })

  return NextResponse.json({ success: true })
}
