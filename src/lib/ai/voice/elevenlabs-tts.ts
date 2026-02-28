import type { VoiceProvider } from './types'

const ELEVENLABS_VOICES = [
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', language: 'multi' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', language: 'multi' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', language: 'multi' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', language: 'multi' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', language: 'multi' },
]

export class ElevenLabsTTSProvider implements VoiceProvider {
  name = 'elevenlabs'
  defaultVoice = 'XrExE9yKIg1WjnnlVkGX' // Matilda
  supportedFormat = 'mp3' as const

  private apiKey: string

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY non configurata')
    }
  }

  async synthesize(text: string, voice?: string): Promise<Buffer> {
    const voiceId = voice || this.defaultVoice

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: text.slice(0, 5000),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      throw new Error(`ElevenLabs TTS error ${res.status}: ${errText}`)
    }

    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  listVoices() {
    return ELEVENLABS_VOICES
  }
}
