import type { VoiceProvider } from './types'
import { OpenAITTSProvider } from './openai-tts'

export function getVoiceProvider(providerName: string): VoiceProvider {
  switch (providerName) {
    case 'openai':
      return new OpenAITTSProvider()
    default:
      throw new Error(`Provider TTS "${providerName}" non supportato`)
  }
}
