import type { Role } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { brand } from '@/lib/branding'
import { ROLE_PERMISSIONS, hasPermission, type Permission, type Module } from '@/lib/permissions'
import { BASE_SYSTEM_PROMPT } from './base'
import { FODI_BRAND_PROMPT } from './brands/fodi'
import { MUSCARI_BRAND_PROMPT } from './brands/muscari'
import { getAllSkillPrompts } from './skills'

const BRAND_PROMPTS_FALLBACK: Record<string, string> = {
  fodi: FODI_BRAND_PROMPT,
  muscari: MUSCARI_BRAND_PROMPT,
}

async function getBrandPrompt(brandSlug: string): Promise<string> {
  try {
    const profile = await prisma.companyProfile.findFirst({
      where: { aiPrompt: { not: null } },
      select: { aiPrompt: true },
    })
    if (profile?.aiPrompt) return profile.aiPrompt
  } catch {
    // DB error: fall back to static files
  }
  return BRAND_PROMPTS_FALLBACK[brandSlug] || ''
}

const MODULE_CAPABILITIES: Record<string, { condition: Module; description: string }[]> = {
  pm: [
    { condition: 'pm', description: '**Progetti**: creare, aggiornare, listare, archiviare, **duplicare** progetti (con cartelle, task, subtask, membri)' },
    { condition: 'pm', description: '**Task**: creare, aggiornare, commentare, eliminare, cercare, duplicare task e subtask' },
    { condition: 'pm', description: '**Task Batch**: aggiornare più task contemporaneamente (stato, priorità, assegnatario, cartella), spostare task in cartelle' },
    { condition: 'pm', description: '**Dipendenze Task**: visualizzare e gestire dipendenze tra task, allegati task' },
    { condition: 'pm', description: '**Cartelle & Link Progetto**: creare/listare/modificare cartelle, aggiungere link URL a progetti e cartelle' },
    { condition: 'pm', description: '**Milestone Progetto**: creare e gestire traguardi di progetto' },
    { condition: 'pm', description: '**Membri Progetto**: aggiungere, rimuovere, listare membri. Aggiungere utente a più progetti in batch.' },
    { condition: 'pm', description: '**Ricerca Utenti**: cercare utenti per nome, cognome, email o username' },
    { condition: 'pm', description: '**Coordinamento Team**: creare progetti da brief, assegnare task, monitorare avanzamento, notificare il team' },
    { condition: 'pm', description: '**Report**: analytics, carico team, ricerca trasversale' },
  ],
  crm: [
    { condition: 'crm', description: '**CRM**: gestire lead, clienti, deal, contatti, registrare interazioni, convertire lead in clienti' },
    { condition: 'crm', description: '**Dettagli CRM**: informazioni complete su clienti e deal' },
    { condition: 'crm', description: '**Report CRM**: statistiche CRM, pipeline' },
  ],
  erp: [
    { condition: 'erp', description: '**ERP & Finanza**: preventivi (da template), spese, entrate, report mensile, fatture ricorrenti, dashboard contabile, obiettivi profitto' },
    { condition: 'erp', description: '**Conti Bancari & Trasferimenti**: lista conti, giroconto, categorie contabili, aliquote IVA' },
    { condition: 'erp', description: '**Fatture Ricorrenti**: creare e gestire spese/entrate ricorrenti' },
    { condition: 'erp', description: '**Template Preventivi**: consultare template per creazione rapida preventivi' },
    { condition: 'erp', description: '**Firma Digitale**: creare e monitorare richieste di firma digitale documenti' },
  ],
  support: [
    { condition: 'support', description: '**Support**: ticket (creare, aggiornare, listare, dettagli, commentare)' },
  ],
  kb: [
    { condition: 'kb', description: '**Knowledge Base**: consultare la base di conoscenza aziendale per risposte accurate e contestuali' },
    { condition: 'kb', description: '**Wiki Aziendale**: cercare, leggere, creare, modificare ed eliminare pagine wiki con gerarchia e tag' },
  ],
  content: [
    { condition: 'content', description: '**Documenti**: listare e consultare documenti di progetti e clienti' },
  ],
  chat: [
    { condition: 'chat', description: '**Chat & Messaggistica**: inviare messaggi nei canali, DM a colleghi, cercare messaggi, messaggi non letti, gestire membri canali' },
  ],
  admin: [
    { condition: 'admin', description: '**Profilo Aziendale**: dati aziendali, partita IVA, contatti' },
    { condition: 'admin', description: '**Storico Attività**: log completo delle azioni eseguite nel sistema' },
    { condition: 'admin', description: '**Preferenze Notifiche**: configurare quali notifiche ricevere e su quale canale' },
  ],
}

const ALWAYS_AVAILABLE_CAPABILITIES = [
  '**Calendario**: vedere/creare/modificare/eliminare eventi, trovare slot liberi',
  '**Time Tracking**: registrare ore, riepilogo per utente/progetto/task',
  '**Riepilogo giornata**: panoramica completa della giornata dell\'utente',
  '**Notifiche**: inviare e leggere notifiche in-app, segnarle come lette',
  '**Memoria & Preferenze**: memorizzare regole e preferenze utente che persistono tra conversazioni',
  '**Work Sessions**: clock in/out, monitoraggio sessioni di lavoro',
  '**Report Giornalieri**: consultare report giornalieri generati automaticamente',
]

function buildCapabilitiesSection(
  role: Role,
  customModulePermissions?: Record<string, string[]> | null,
): string {
  const lines: string[] = ['## Capacità', 'Hai accesso a tool che ti permettono di:']

  for (const [, entries] of Object.entries(MODULE_CAPABILITIES)) {
    for (const entry of entries) {
      if (hasPermission(role, entry.condition, 'read', customModulePermissions)) {
        lines.push(`- ${entry.description}`)
      }
    }
  }

  for (const cap of ALWAYS_AVAILABLE_CAPABILITIES) {
    lines.push(`- ${cap}`)
  }

  return lines.join('\n')
}

function formatPermissions(role: Role): string {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return 'Nessun permesso configurato'

  return Object.entries(perms)
    .map(([mod, permissions]) => `${mod}: ${(permissions as Permission[]).join(', ')}`)
    .join(' | ')
}

async function loadUserPreferences(userId: string): Promise<string> {
  try {
    const prefs = await prisma.aiUserPreference.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { key: true, value: true },
    })
    if (prefs.length === 0) return ''
    let section = '\n\n## Preferenze utente memorizzate\n'
    for (const p of prefs) {
      section += `- **${p.key}**: ${p.value}\n`
    }
    return section
  } catch {
    return ''
  }
}

interface BuildPromptParams {
  userName: string
  userRole: Role
  userId?: string
  agentName?: string
  customPrompt?: string | null
  currentPage?: string
  customModulePermissions?: Record<string, string[]> | null
}

export async function buildSystemPrompt({ userName, userRole, userId, agentName, customPrompt, currentPage, customModulePermissions }: BuildPromptParams): Promise<string> {
  const brandSlug = brand.slug
  const brandPrompt = await getBrandPrompt(brandSlug)

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
    .replaceAll('{BRAND_NAME}', brand.name)
    .replaceAll('{AGENT_NAME}', agentName || 'Assistente AI')
    .replaceAll('{CURRENT_DATE}', `${currentDate} (${todayISO})`)
    .replaceAll('{TOMORROW_DATE}', `${tomorrowFormatted} (${tomorrowISO})`)
    .replaceAll('{USER_NAME}', userName)
    .replaceAll('{USER_ROLE}', userRole)
    .replaceAll('{USER_PERMISSIONS}', formatPermissions(userRole))
    .replaceAll('{CAPABILITIES}', buildCapabilitiesSection(userRole, customModulePermissions))

  // Add brand-specific context
  if (brandPrompt) {
    prompt += '\n' + brandPrompt
  }

  // Add skill prompts (chat, notifications, coordination, etc.)
  const skillPrompts = getAllSkillPrompts()
  if (skillPrompts) {
    prompt += '\n\n## Linee guida operative' + skillPrompts
  }

  // Add page context
  if (currentPage) {
    prompt += `\n\n## Contesto pagina\nL'utente sta visualizzando: ${currentPage}`
  }

  // Add custom prompt from admin config
  if (customPrompt) {
    prompt += '\n\n## Istruzioni personalizzate\n' + customPrompt
  }

  // Load knowledge base
  try {
    const knowledgePages = await prisma.aiKnowledgePage.findMany({
      where: { brandSlug: brand.slug, isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
      select: { title: true, content: true, category: true },
    })

    if (knowledgePages.length > 0) {
      prompt += '\n\n## Knowledge Base aziendale\nUsa queste informazioni per rispondere con contesto aziendale accurato.\n'
      for (const page of knowledgePages) {
        prompt += `\n### ${page.title} [${page.category}]\n${page.content}\n`
      }
    }
  } catch {
    // Knowledge base loading is best-effort
  }

  // Load user preferences (persistent memory)
  if (userId) {
    prompt += await loadUserPreferences(userId)
  }

  return prompt
}
