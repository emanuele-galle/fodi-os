import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { brand } from '@/lib/branding'

export async function GET(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  try {
    const config = await prisma.aiAgentConfig.findUnique({
      where: { brandSlug: brand.slug },
      select: { voiceAgentId: true, voiceAgentEnabled: true },
    })

    if (!config?.voiceAgentEnabled || !config.voiceAgentId) {
      return NextResponse.json({ error: 'Assistente vocale non abilitato' }, { status: 403 })
    }

    const agentId = config.voiceAgentId
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY non configurata' }, { status: 500 })
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      { headers: { 'xi-api-key': apiKey } },
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('[voice-agent/token] ElevenLabs error:', res.status, text)
      return NextResponse.json({ error: 'Errore generazione token' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ success: true, signedUrl: data.signed_url })
  } catch (err) {
    console.error('[voice-agent/token]', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
