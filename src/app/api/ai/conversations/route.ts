import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    const conversations = await prisma.aiConversation.findMany({
      where: { userId: auth.userId, isArchived: false },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        channel: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    })

    return NextResponse.json({ success: true, data: conversations })
  } catch (err) {
    console.error('[ai/conversations/GET]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    const conv = await prisma.aiConversation.create({
      data: { userId: auth.userId, channel: 'WEB' },
    })

    return NextResponse.json({ success: true, data: conv }, { status: 201 })
  } catch (err) {
    console.error('[ai/conversations/POST]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
