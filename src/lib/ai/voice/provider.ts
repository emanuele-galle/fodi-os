import type { VoiceProvider } from './types'
import { OpenAITTSProvider } from './openai-tts'
import { ElevenLabsTTSProvider } from './elevenlabs-tts'

export function getVoiceProvider(providerName: string): VoiceProvider {
  switch (providerName) {
    case 'openai':
      return new OpenAITTSProvider()
    case 'elevenlabs':
      return new ElevenLabsTTSProvider()
    default:
      throw new Error(`Provider TTS "${providerName}" non supportato`)
  }
}
