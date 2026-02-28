export interface VoiceProvider {
  name: string
  synthesize(text: string, voice?: string): Promise<Buffer>
  listVoices(): { id: string; name: string; language: string }[]
  defaultVoice: string
  supportedFormat: 'mp3' | 'opus' | 'wav'
}
