import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runAgent } from '@/lib/ai/agent'
import type { AiChannel } from '@/generated/prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform, chatId, senderPhone, message, webhookSecret } = body

    // Verify webhook secret
    if (webhookSecret !== process.env.AI_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!message || !platform) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Determine channel
    const channel: AiChannel = platform === 'whatsapp' ? 'WHATSAPP' : platform === 'telegram' ? 'TELEGRAM' : 'API'

    // Find user by phone
    let user = null
    if (senderPhone) {
      // Normalize phone: remove spaces, dashes, keep + prefix
      const normalizedPhone = senderPhone.replace(/[\s-]/g, '')
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { phone: { endsWith: normalizedPhone.replace(/^\+\d{1,3}/, '') } },
          ],
          isActive: true,
        },
        select: { id: true, role: true },
      })
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        reply: 'Non riesco a identificarti. Assicurati che il tuo numero di telefono sia registrato nella piattaforma.',
      })
    }

    // Find or create conversation for this external chat
    const externalId = `${platform}:${chatId}`
    let conversation = await prisma.aiConversation.findFirst({
      where: { userId: user.id, channel, externalId, isArchived: false },
    })

    if (!conversation) {
      conversation = await prisma.aiConversation.create({
        data: { userId: user.id, channel, externalId },
      })
    }

    // Run agent (non-streaming for webhook)
    const result = await runAgent({
      conversationId: conversation.id,
      userMessage: message,
      userId: user.id,
      role: user.role,
    })

    return NextResponse.json({
      success: true,
      reply: result.assistantMessage,
      conversationId: conversation.id,
    })
  } catch (err) {
    console.error('[ai/webhook]', err)
    return NextResponse.json({
      success: false,
      reply: 'Si è verificato un errore. Riprova tra qualche momento.',
    }, { status: 500 })
  }
}
