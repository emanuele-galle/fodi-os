import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { brand } from '@/lib/branding'
import { getVoiceProvider } from '@/lib/ai/voice/provider'

export async function POST(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  // Rate limit: 20 TTS requests per minute
  if (!rateLimit(`ai:tts:${auth.userId}`, 20, 60000)) {
    return NextResponse.json({ error: 'Troppe richieste TTS. Attendi un momento.' }, { status: 429 })
  }

  try {
    const { text, voice } = await request.json()

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Testo vuoto' }, { status: 400 })
    }

    // Load config for TTS provider
    const config = await prisma.aiAgentConfig.findUnique({
      where: { brandSlug: brand.slug },
      select: { ttsProvider: true, ttsVoice: true },
    })

    const providerName = config?.ttsProvider || process.env.TTS_PROVIDER || 'disabled'

    if (providerName === 'disabled') {
      return NextResponse.json({ error: 'TTS non abilitato' }, { status: 503 })
    }

    const provider = getVoiceProvider(providerName)
    const selectedVoice = voice || config?.ttsVoice || provider.defaultVoice

    const audioBuffer = await provider.synthesize(text.trim(), selectedVoice)

    const contentType = provider.supportedFormat === 'mp3' ? 'audio/mpeg' : `audio/${provider.supportedFormat}`

    return new Response(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[ai/tts]', err)
    const message = err instanceof Error ? err.message : 'Errore TTS'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET endpoint to list available voices
export async function GET(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    const config = await prisma.aiAgentConfig.findUnique({
      where: { brandSlug: brand.slug },
      select: { ttsProvider: true, ttsVoice: true, autoPlayVoice: true },
    })

    const providerName = config?.ttsProvider || 'disabled'

    if (providerName === 'disabled') {
      return NextResponse.json({
        success: true,
        data: { provider: 'disabled', voices: [], currentVoice: null, autoPlay: false },
      })
    }

    const provider = getVoiceProvider(providerName)

    return NextResponse.json({
      success: true,
      data: {
        provider: providerName,
        voices: provider.listVoices(),
        currentVoice: config?.ttsVoice || provider.defaultVoice,
        autoPlay: config?.autoPlayVoice ?? false,
      },
    })
  } catch (err) {
    console.error('[ai/tts/GET]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
