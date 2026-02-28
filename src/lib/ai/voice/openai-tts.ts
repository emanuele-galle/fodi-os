import type { VoiceProvider } from './types'

const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', language: 'multi' },
  { id: 'ash', name: 'Ash', language: 'multi' },
  { id: 'coral', name: 'Coral', language: 'multi' },
  { id: 'echo', name: 'Echo', language: 'multi' },
  { id: 'fable', name: 'Fable', language: 'multi' },
  { id: 'onyx', name: 'Onyx', language: 'multi' },
  { id: 'nova', name: 'Nova', language: 'multi' },
  { id: 'sage', name: 'Sage', language: 'multi' },
  { id: 'shimmer', name: 'Shimmer', language: 'multi' },
]

export class OpenAITTSProvider implements VoiceProvider {
  name = 'openai'
  defaultVoice = 'nova'
  supportedFormat = 'mp3' as const

  private apiKey: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY non configurata')
    }
  }

  async synthesize(text: string, voice?: string): Promise<Buffer> {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.slice(0, 4096),
        voice: voice || this.defaultVoice,
        response_format: 'mp3',
        speed: 1.0,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      throw new Error(`OpenAI TTS error ${res.status}: ${errText}`)
    }

    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  listVoices() {
    return OPENAI_VOICES
  }
}
