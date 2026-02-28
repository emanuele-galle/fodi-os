import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { runAgent } from '@/lib/ai/agent'
import { createAiStream } from '@/lib/ai/stream'

export async function POST(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    const { message, conversationId, currentPage } = await request.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Messaggio vuoto' }, { status: 400 })
    }

    // Get or create conversation
    let convId = conversationId
    if (!convId) {
      const conv = await prisma.aiConversation.create({
        data: { userId: auth.userId, channel: 'WEB' },
      })
      convId = conv.id
    } else {
      // Verify ownership
      const conv = await prisma.aiConversation.findUnique({
        where: { id: convId },
        select: { userId: true, isArchived: true },
      })
      if (!conv || conv.userId !== auth.userId) {
        return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 })
      }
      if (conv.isArchived) {
        return NextResponse.json({ error: 'Conversazione archiviata' }, { status: 400 })
      }
    }

    // Load custom module permissions if custom role
    let customModulePermissions: Record<string, string[]> | null = null
    if (auth.customRoleId) {
      const customRole = await prisma.customRole.findUnique({
        where: { id: auth.customRoleId },
        select: { modulePermissions: true },
      })
      if (customRole) {
        customModulePermissions = customRole.modulePermissions as Record<string, string[]>
      }
    }

    // SSE streaming
    const { stream, enqueue, close } = createAiStream()

    // Send conversationId immediately
    enqueue({ type: 'text_delta', data: { conversationId: convId } })

    // Run agent in background
    runAgent({
      conversationId: convId,
      userMessage: message.trim(),
      userId: auth.userId,
      role: auth.role,
      customModulePermissions,
      currentPage: currentPage || undefined,
      onEvent: enqueue,
    })
      .then(() => close())
      .catch((err) => {
        enqueue({ type: 'error', data: { message: (err as Error).message } })
        close()
      })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Conversation-Id': convId,
      },
    })
  } catch (err) {
    console.error('[ai/chat]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
