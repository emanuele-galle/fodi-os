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
    const conversation = await prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
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
