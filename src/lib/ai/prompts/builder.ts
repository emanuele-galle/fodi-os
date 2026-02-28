import type { Role } from '@/generated/prisma/client'
import { brand } from '@/lib/branding'
import { ROLE_PERMISSIONS, type Module, type Permission } from '@/lib/permissions'
import { BASE_SYSTEM_PROMPT } from './base'
import { FODI_BRAND_PROMPT } from './brands/fodi'
import { MUSCARI_BRAND_PROMPT } from './brands/muscari'

const BRAND_PROMPTS: Record<string, string> = {
  fodi: FODI_BRAND_PROMPT,
  muscari: MUSCARI_BRAND_PROMPT,
}

function formatPermissions(role: Role): string {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return 'Nessun permesso configurato'

  return Object.entries(perms)
    .map(([mod, permissions]) => `${mod}: ${(permissions as Permission[]).join(', ')}`)
    .join(' | ')
}

interface BuildPromptParams {
  userName: string
  userRole: Role
  agentName?: string
  customPrompt?: string | null
  currentPage?: string
}

export function buildSystemPrompt({ userName, userRole, agentName, customPrompt, currentPage }: BuildPromptParams): string {
  const brandSlug = brand.slug
  const brandPrompt = BRAND_PROMPTS[brandSlug] || ''

  // Current date/time in Europe/Rome timezone
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const isoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const currentDate = formatter.format(now)
  const todayISO = isoFormatter.format(now)

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowFormatted = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(tomorrow)
  const tomorrowISO = isoFormatter.format(tomorrow)

  let prompt = BASE_SYSTEM_PROMPT
    .replace('{BRAND_NAME}', brand.name)
    .replace('{AGENT_NAME}', agentName || 'Assistente AI')
    .replace('{CURRENT_DATE}', `${currentDate} (${todayISO})`)
    .replace('{TOMORROW_DATE}', `${tomorrowFormatted} (${tomorrowISO})`)
    .replace('{USER_NAME}', userName)
    .replace('{USER_ROLE}', userRole)
    .replace('{USER_PERMISSIONS}', formatPermissions(userRole))

  // Add brand-specific context
  if (brandPrompt) {
    prompt += '\n' + brandPrompt
  }

  // Add page context
  if (currentPage) {
    prompt += `\n\n## Contesto pagina\nL'utente sta visualizzando: ${currentPage}`
  }

  // Add custom prompt from admin config
  if (customPrompt) {
    prompt += '\n\n## Istruzioni personalizzate\n' + customPrompt
  }

  return prompt
}
