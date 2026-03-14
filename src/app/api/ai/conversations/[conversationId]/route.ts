import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  const { conversationId } = await params

  try {
    // Support pagination for messages via ?limit=N&offset=N (default: last 100 messages)
    const { searchParams } = request.nextUrl
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          skip: offset,
          take: limit,
          select: {
            id: true,
            role: true,
            content: true,
            toolCalls: true,
            tokenInput: true,
            tokenOutput: true,
            latencyMs: true,
            model: true,
            createdAt: true,
            toolExecutions: {
              select: {
                id: true,
                toolName: true,
                status: true,
                durationMs: true,
                error: true,
              },
            },
          },
        },
        _count: { select: { messages: true } },
      },
    })

    if (!conversation || conversation.userId !== auth.userId) {
      return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: conversation })
  } catch (err) {
    console.error('[ai/conversations/[id]/GET]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  const { conversationId } = await params

  try {
    const conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    })

    if (!conversation || conversation.userId !== auth.userId) {
      return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 })
    }

    await prisma.aiConversation.update({
      where: { id: conversationId },
      data: { isArchived: true },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[ai/conversations/[id]/DELETE]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
