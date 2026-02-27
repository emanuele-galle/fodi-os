import { brand } from '@/lib/branding'
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { isMicrosoftConfigured } from '@/lib/microsoft-graph'

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

async function getUserId(request: NextRequest): Promise<string | null> {
  const fromHeader = request.headers.get('x-user-id')
  if (fromHeader) return fromHeader

  const token = request.cookies.get(brand.cookies.access)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET)
    return payload.sub as string
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  if (!isMicrosoftConfigured()) {
    return NextResponse.json({ configured: false, connected: false })
  }

  const userId = await getUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const token = await prisma.microsoftToken.findUnique({
    where: { userId },
    select: {
      email: true,
      scope: true,
      expiresAt: true,
      updatedAt: true,
      todoListId: true,
      webhookExpiry: true,
    },
  })

  if (!token) {
    return NextResponse.json({ configured: true, connected: false })
  }

  return NextResponse.json({
    configured: true,
    connected: true,
    email: token.email,
    todoListId: token.todoListId,
    webhookActive: token.webhookExpiry ? token.webhookExpiry > new Date() : false,
    lastSync: token.updatedAt,
  })
}
