import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  const auth = getAuthHeaders(request)
  if (!auth.ok) return auth.response

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
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

    // Max 25MB (OpenAI limit)
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio troppo lungo. Massimo 25MB.' }, { status: 400 })
    }

    // Send to OpenAI Whisper API
    const whisperForm = new FormData()
    whisperForm.append('file', audio, 'audio.webm')
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', 'it')
    whisperForm.append('response_format', 'json')

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
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
  } catch (err) {
    console.error('[ai/transcribe]', err)
    return NextResponse.json({ error: 'Errore interno trascrizione' }, { status: 500 })
  }
}
