import type { Role, Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { brand } from '@/lib/branding'
import { rateLimit } from '@/lib/rate-limit'
import { hasPermission } from '@/lib/permissions'
import { logActivity } from '@/lib/activity-log'
import { anthropic } from './anthropic'
import { buildSystemPrompt } from './prompts/builder'
import { getToolsForRole, findTool, toAnthropicTools } from './tools/registry'
import type { AiStreamEvent } from './stream'
import type { AiToolContext } from './tools/types'

const MAX_TOOL_ROUNDS = 10

// Tool names that suggest specific follow-up questions
const TOOL_FOLLOWUPS: Record<string, string[]> = {
  list_tasks: ['Mostra i task in ritardo', 'Crea un nuovo task', 'Quali task sono urgenti?'],
  list_leads: ['Converti un lead in cliente', 'Quanti lead ho questo mese?', 'Lead per sorgente'],
  list_deals: ['Valore totale pipeline', 'Deal in scadenza questa settimana', 'Statistiche CRM'],
  list_calendar_events: ['Trova uno slot libero', 'Crea un evento', 'Cosa ho domani?'],
  get_analytics_overview: ['Dettaglio task per stato', 'Performance team', 'Trend ultimo mese'],
  get_my_day_summary: ['Quali task devo completare oggi?', 'Mostra calendario di domani', 'Report settimanale'],
  get_crm_stats: ['Top clienti per fatturato', 'Lead conversion rate', 'Pipeline per fase'],
  get_team_workload: ['Chi ha il carico maggiore?', 'Task non assegnati', 'Ore registrate questa settimana'],
  search_platform: ['Cerca in un ambito specifico', 'Mostra dettagli del risultato', 'Filtra per stato'],
  // ERP
  get_financial_summary: ['Dettaglio spese per categoria', 'Confronto con mese scorso', 'Entrate per cliente'],
  list_quotes: ['Crea un nuovo preventivo', 'Preventivi in scadenza', 'Fatturato mensile'],
  get_quote_details: ['Aggiorna stato preventivo', 'Crea preventivo simile', 'Contatta il cliente'],
  list_expenses: ['Registra una spesa', 'Spese per categoria', 'Spese ricorrenti attive'],
  list_income: ['Registra un\'entrata', 'Fatture non pagate', 'Entrate per periodo'],
  get_monthly_report: ['Confronto anno su anno', 'Dettaglio entrate', 'Obiettivi di profitto'],
  list_recurring_invoices: ['Prossime scadenze', 'Spesa ricorrente totale', 'Fatture da rinnovare'],
  list_invoice_monitoring: ['Sollecita pagamento', 'Fatture scadute', 'Riepilogo incassi'],
  create_quote: ['Invia preventivo al cliente', 'Crea altro preventivo', 'Lista preventivi'],
  // Support
  list_tickets: ['Crea un ticket', 'Ticket urgenti aperti', 'Ticket non assegnati'],
  get_ticket_details: ['Aggiorna stato ticket', 'Assegna ticket', 'Rispondi al ticket'],
  create_ticket: ['Lista ticket aperti', 'Assegna a un collega', 'Ticket per cliente'],
  // Time Tracking
  list_time_entries: ['Registra ore', 'Riepilogo settimanale', 'Ore per progetto'],
  log_time: ['Riepilogo ore oggi', 'Ore registrate questa settimana', 'Task attivi'],
  get_time_summary: ['Dettaglio per utente', 'Ore fatturabili', 'Confronto con settimana scorsa'],
}

interface AgentParams {
  conversationId: string
  userMessage: string
  userId: string
  role: Role
  customModulePermissions?: Record<string, string[]> | null
  currentPage?: string
  onEvent?: (event: AiStreamEvent) => void
}

interface AgentResult {
  assistantMessage: string
  tokenInput: number
  tokenOutput: number
  model: string
}

export async function runAgent(params: AgentParams): Promise<AgentResult> {
  const { conversationId, userMessage, userId, role, customModulePermissions, currentPage, onEvent } = params

  // Rate limit
  if (!rateLimit(`ai:chat:${userId}`, 30, 60000)) {
    throw new Error('Troppe richieste. Attendi un momento prima di riprovare.')
  }

  // Load config
  const config = await prisma.aiAgentConfig.findUnique({
    where: { brandSlug: brand.slug },
  })

  // Load user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  })

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    userName: user ? `${user.firstName} ${user.lastName}` : 'Utente',
    userRole: role,
    agentName: config?.name || undefined,
    customPrompt: config?.systemPrompt,
    currentPage,
  })

  // Get tools for user role
  const tools = getToolsForRole(
    role,
    customModulePermissions,
    config?.enabledTools.length ? config.enabledTools : undefined,
  )
  const anthropicTools = toAnthropicTools(tools)

  // Load conversation history (last 50 messages) or use summary + recent
  const conversation = await prisma.aiConversation.findUnique({
    where: { id: conversationId },
    select: { summary: true },
  })

  const msgCount = await prisma.aiMessage.count({ where: { conversationId } })

  let history
  if (conversation?.summary && msgCount > 30) {
    // Use summary + last 20 messages
    history = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip: Math.max(0, msgCount - 20),
      take: 20,
      select: { role: true, content: true, toolCalls: true },
    })
  } else {
    history = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: { role: true, content: true, toolCalls: true },
    })
  }

  // Build messages array
  type MessageParam = { role: 'user' | 'assistant'; content: string | ContentBlock[] }
  type ContentBlock = { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: unknown } | { type: 'tool_result'; tool_use_id: string; content: string }

  const messages: MessageParam[] = []

  // Inject summary as context if available
  if (conversation?.summary && msgCount > 30) {
    messages.push({
      role: 'user',
      content: `[Riepilogo conversazione precedente: ${conversation.summary}]`,
    })
    messages.push({
      role: 'assistant',
      content: 'Ho il contesto della nostra conversazione precedente. Come posso aiutarti?',
    })
  }

  messages.push(...history.map((m) => {
    if (m.role === 'TOOL_RESULT') {
      return {
        role: 'user' as const,
        content: [{ type: 'tool_result' as const, tool_use_id: (m.toolCalls as { toolUseId: string })?.toolUseId || '', content: m.content }],
      }
    }
    if (m.role === 'ASSISTANT' && m.toolCalls) {
      const tc = m.toolCalls as { id: string; name: string; input: unknown }[]
      return {
        role: 'assistant' as const,
        content: [
          ...(m.content ? [{ type: 'text' as const, text: m.content }] : []),
          ...tc.map((t) => ({ type: 'tool_use' as const, id: t.id, name: t.name, input: t.input })),
        ],
      }
    }
    return {
      role: m.role === 'USER' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }
  }))

  // Add current user message
  messages.push({ role: 'user', content: userMessage })

  // Save user message
  await prisma.aiMessage.create({
    data: {
      conversationId,
      role: 'USER',
      content: userMessage,
    },
  })

  // Agent loop
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let finalText = ''
  const modelId = config?.model || process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6'
  const usedToolNames: string[] = []

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const startMs = Date.now()

    const stream = anthropic.messages.stream({
      model: modelId,
      max_tokens: config?.maxTokens || Number(process.env.AI_MAX_TOKENS) || 4096,
      temperature: config?.temperature ?? 0.7,
      system: systemPrompt,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      messages: messages as Parameters<typeof anthropic.messages.create>[0]['messages'],
    })

    const textParts: string[] = []
    const toolUses: { id: string; name: string; input: unknown }[] = []
    let currentTextBlock = ''

    stream.on('text', (text) => {
      currentTextBlock += text
      onEvent?.({ type: 'text_delta', data: { text } })
    })

    stream.on('contentBlock', (block) => {
      if (block.type === 'text') {
        textParts.push(currentTextBlock)
        currentTextBlock = ''
      } else if (block.type === 'tool_use') {
        toolUses.push({ id: block.id, name: block.name, input: block.input })
        usedToolNames.push(block.name)
        onEvent?.({ type: 'tool_use_start', data: { id: block.id, name: block.name } })
      }
    })

    const response = await stream.finalMessage()

    // Push any remaining text
    if (currentTextBlock) {
      textParts.push(currentTextBlock)
    }

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    const latencyMs = Date.now() - startMs

    const text = textParts.join('')

    if (response.stop_reason === 'end_turn' || toolUses.length === 0) {
      // Save assistant message and finish
      finalText = text
      await prisma.aiMessage.create({
        data: {
          conversationId,
          role: 'ASSISTANT',
          content: text,
          tokenInput: totalInputTokens,
          tokenOutput: totalOutputTokens,
          latencyMs,
          model: modelId,
        },
      })
      break
    }

    // Save assistant message with tool calls
    const assistantMsg = await prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: text,
        toolCalls: toolUses as unknown as Prisma.InputJsonValue,
        tokenInput: response.usage.input_tokens,
        tokenOutput: response.usage.output_tokens,
        latencyMs,
        model: modelId,
      },
    })

    // Add assistant message to conversation
    messages.push({
      role: 'assistant',
      content: [
        ...(text ? [{ type: 'text' as const, text }] : []),
        ...toolUses.map((t) => ({ type: 'tool_use' as const, id: t.id, name: t.name, input: t.input })),
      ],
    })

    // Execute each tool
    for (const toolUse of toolUses) {
      const toolDef = findTool(toolUse.name)
      let result: string
      let status: 'SUCCESS' | 'ERROR' | 'DENIED' = 'SUCCESS'

      if (!toolDef) {
        result = JSON.stringify({ success: false, error: `Tool "${toolUse.name}" non trovato` })
        status = 'ERROR'
      } else if (!hasPermission(role, toolDef.module, toolDef.requiredPermission, customModulePermissions)) {
        result = JSON.stringify({ success: false, error: `Permesso negato per ${toolUse.name}` })
        status = 'DENIED'
      } else if (!rateLimit(`ai:tool:${userId}`, 50, 60000)) {
        result = JSON.stringify({ success: false, error: 'Rate limit tool raggiunto' })
        status = 'ERROR'
      } else {
        const toolStart = Date.now()
        try {
          const toolContext: AiToolContext = { userId, role, customModulePermissions }
          const toolResult = await toolDef.execute(toolUse.input as Record<string, unknown>, toolContext)
          result = JSON.stringify(toolResult)

          // Log tool execution
          await prisma.aiToolExecution.create({
            data: {
              messageId: assistantMsg.id,
              toolName: toolUse.name,
              input: toolUse.input as Prisma.InputJsonValue,
              output: toolResult as unknown as Prisma.InputJsonValue,
              status: toolResult.success ? 'SUCCESS' : 'ERROR',
              durationMs: Date.now() - toolStart,
              error: toolResult.error || null,
            },
          })
        } catch (err) {
          result = JSON.stringify({ success: false, error: `Errore esecuzione tool: ${(err as Error).message}` })
          status = 'ERROR'

          await prisma.aiToolExecution.create({
            data: {
              messageId: assistantMsg.id,
              toolName: toolUse.name,
              input: toolUse.input as Prisma.InputJsonValue,
              status: 'ERROR',
              durationMs: Date.now() - toolStart,
              error: (err as Error).message,
            },
          })
        }
      }

      onEvent?.({ type: 'tool_result', data: { id: toolUse.id, name: toolUse.name, status, result: JSON.parse(result) } })

      // Save tool result message
      await prisma.aiMessage.create({
        data: {
          conversationId,
          role: 'TOOL_RESULT',
          content: result,
          toolCalls: { toolUseId: toolUse.id },
        },
      })

      // Add to messages for next round
      messages.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: result }],
      })
    }
  }

  // Generate follow-up suggestions based on tools used
  const followups = generateFollowups(usedToolNames)
  if (followups.length > 0) {
    onEvent?.({ type: 'suggested_followups', data: { suggestions: followups } })
  }

  // Update conversation title if first message
  const userMsgCount = await prisma.aiMessage.count({ where: { conversationId, role: 'USER' } })
  if (userMsgCount <= 1) {
    const title = userMessage.slice(0, 80) + (userMessage.length > 80 ? '...' : '')
    await prisma.aiConversation.update({
      where: { id: conversationId },
      data: { title },
    })
  }

  // Summarize if conversation is getting long
  const totalMsgCount = await prisma.aiMessage.count({ where: { conversationId } })
  if (totalMsgCount > 30) {
    summarizeConversation(conversationId).catch(() => {})
  }

  // Log activity
  logActivity({
    userId,
    action: 'ai_chat',
    entityType: 'ai_conversation',
    entityId: conversationId,
    metadata: { tokensUsed: totalInputTokens + totalOutputTokens },
  })

  return {
    assistantMessage: finalText,
    tokenInput: totalInputTokens,
    tokenOutput: totalOutputTokens,
    model: modelId,
  }
}

function generateFollowups(usedToolNames: string[]): string[] {
  const allFollowups: string[] = []
  const seen = new Set<string>()

  for (const toolName of usedToolNames) {
    const suggestions = TOOL_FOLLOWUPS[toolName]
    if (suggestions) {
      for (const s of suggestions) {
        if (!seen.has(s)) {
          seen.add(s)
          allFollowups.push(s)
        }
      }
    }
  }

  // Return max 3 suggestions
  return allFollowups.slice(0, 3)
}

async function summarizeConversation(conversationId: string) {
  const conversation = await prisma.aiConversation.findUnique({
    where: { id: conversationId },
    select: { summary: true },
  })

  // Only summarize once (or re-summarize if very old)
  if (conversation?.summary) return

  const messages = await prisma.aiMessage.findMany({
    where: { conversationId, role: { in: ['USER', 'ASSISTANT'] } },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: { role: true, content: true },
  })

  if (messages.length < 10) return

  const summaryText = messages
    .map(m => `${m.role === 'USER' ? 'Utente' : 'Assistente'}: ${m.content.slice(0, 200)}`)
    .join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Riassumi in 2-3 frasi concise questa conversazione tra utente e assistente AI. Focus sui topic principali e azioni compiute:\n\n${summaryText}`,
      }],
    })

    const summary = response.content[0]?.type === 'text' ? response.content[0].text : ''
    if (summary) {
      await prisma.aiConversation.update({
        where: { id: conversationId },
        data: { summary },
      })
    }
  } catch {
    // Summary is best-effort, don't fail the main flow
  }
}
