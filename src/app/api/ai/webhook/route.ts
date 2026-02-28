import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runAgent } from '@/lib/ai/agent'
import type { AiChannel } from '@/generated/prisma/client'

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform, chatId, senderPhone, senderUsername, message, audioUrl, imageUrl, webhookSecret } = body

    // Verify webhook secret
    if (webhookSecret !== process.env.AI_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if ((!message && !audioUrl && !imageUrl) || !platform) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Determine channel
    const channel: AiChannel = platform === 'whatsapp' ? 'WHATSAPP' : platform === 'telegram' ? 'TELEGRAM' : 'API'

    // Find user by phone or username
    let user = null
    if (senderPhone) {
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

    // Fallback: find by username (Telegram)
    if (!user && senderUsername) {
      user = await prisma.user.findFirst({
        where: { username: senderUsername, isActive: true },
        select: { id: true, role: true },
      })
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        reply: 'Non riesco a identificarti. Assicurati che il tuo numero di telefono sia registrato nella piattaforma.',
      })
    }

    // Handle audio messages: transcribe via Whisper
    let finalMessage = message || ''
    if (audioUrl && !message) {
      try {
        const transcription = await transcribeAudioUrl(audioUrl)
        if (transcription) {
          finalMessage = transcription
        } else {
          return NextResponse.json({
            success: false,
            reply: 'Non sono riuscito a trascrivere il messaggio vocale. Riprova con un messaggio di testo.',
          })
        }
      } catch {
        return NextResponse.json({
          success: false,
          reply: 'Errore nella trascrizione del messaggio vocale.',
        })
      }
    }

    // Handle image messages: add as attachment context
    const attachments = imageUrl ? [{
      url: imageUrl,
      mimeType: 'image/jpeg',
      fileName: 'image.jpg',
    }] : undefined

    if (!finalMessage && imageUrl) {
      finalMessage = 'Analizza questa immagine'
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
      userMessage: finalMessage,
      userId: user.id,
      role: user.role,
      attachments,
    })

    return NextResponse.json({
      success: true,
      reply: result.assistantMessage,
      conversationId: conversation.id,
      tokensUsed: result.tokenInput + result.tokenOutput,
    })
  } catch (err) {
    console.error('[ai/webhook]', err)
    return NextResponse.json({
      success: false,
      reply: 'Si è verificato un errore. Riprova tra qualche momento.',
    }, { status: 500 })
  }
}

/**
 * Transcribe audio from URL using OpenAI Whisper API.
 */
async function transcribeAudioUrl(audioUrl: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    // Download audio
    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) return null

    const audioBlob = await audioRes.blob()
    if (audioBlob.size > 25 * 1024 * 1024) return null // Max 25MB

    // Send to Whisper
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.ogg')
    formData.append('model', 'whisper-1')
    formData.append('language', 'it')
    formData.append('response_format', 'json')

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.text || null
  } catch {
    return null
  }
}
