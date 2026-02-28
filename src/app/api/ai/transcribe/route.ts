import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  // Try ElevenLabs first, then OpenAI Whisper
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!elevenLabsKey && !openaiKey) {
    return NextResponse.json(
      { error: 'Trascrizione vocale non configurata. Contattare l\'amministratore.' },
      { status: 503 },
    )
  }

  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null

    if (!audio) {
      return NextResponse.json({ error: 'Nessun file audio' }, { status: 400 })
    }

    // Max 25MB
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio troppo lungo. Massimo 25MB.' }, { status: 400 })
    }

    if (elevenLabsKey) {
      return transcribeWithElevenLabs(audio, elevenLabsKey)
    }
    return transcribeWithWhisper(audio, openaiKey!)
  } catch (err) {
    console.error('[ai/transcribe]', err)
    return NextResponse.json({ error: 'Errore interno trascrizione' }, { status: 500 })
  }
}

async function transcribeWithElevenLabs(audio: File, apiKey: string) {
  const form = new FormData()
  form.append('file', audio, 'audio.webm')
  form.append('model_id', 'scribe_v1')
  form.append('language_code', 'ita')

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  })

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown')
    console.error('[ai/transcribe] ElevenLabs Scribe error:', res.status, err)
    return NextResponse.json({ error: 'Errore trascrizione audio' }, { status: 502 })
  }

  const data = await res.json()

  return NextResponse.json({
    text: data.text || '',
    duration: data.duration || 0,
  })
}

async function transcribeWithWhisper(audio: File, apiKey: string) {
  const form = new FormData()
  form.append('file', audio, 'audio.webm')
  form.append('model', 'whisper-1')
  form.append('language', 'it')
  form.append('response_format', 'json')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown')
    console.error('[ai/transcribe] Whisper error:', res.status, err)
    return NextResponse.json({ error: 'Errore trascrizione audio' }, { status: 502 })
  }

  const data = await res.json()

  return NextResponse.json({
    text: data.text || '',
    duration: data.duration || 0,
  })
}
