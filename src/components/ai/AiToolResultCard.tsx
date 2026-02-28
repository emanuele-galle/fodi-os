'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ChevronDown, CheckCircle2, XCircle, Clock,
  Receipt, Users, Calendar, CheckSquare, Headphones, FolderOpen,
  Plus, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AiToolResultCardProps {
  toolName: string
  result: { success: boolean; data?: unknown; error?: string }
  defaultExpanded?: boolean
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    // Task statuses
    TODO: 'bg-slate-500/10 text-slate-400',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-400',
    IN_REVIEW: 'bg-amber-500/10 text-amber-400',
    DONE: 'bg-emerald-500/10 text-emerald-400',
    CANCELLED: 'bg-red-500/10 text-red-400',
    // Quote statuses
    DRAFT: 'bg-slate-500/10 text-slate-400',
    SENT: 'bg-blue-500/10 text-blue-400',
    APPROVED: 'bg-emerald-500/10 text-emerald-400',
    REJECTED: 'bg-red-500/10 text-red-400',
    EXPIRED: 'bg-amber-500/10 text-amber-400',
    INVOICED: 'bg-violet-500/10 text-violet-400',
    // Ticket statuses
    OPEN: 'bg-blue-500/10 text-blue-400',
    WAITING_CLIENT: 'bg-amber-500/10 text-amber-400',
    RESOLVED: 'bg-emerald-500/10 text-emerald-400',
    CLOSED: 'bg-slate-500/10 text-slate-400',
    // Lead/Deal statuses
    NEW: 'bg-blue-500/10 text-blue-400',
    CONTACTED: 'bg-cyan-500/10 text-cyan-400',
    QUALIFIED: 'bg-violet-500/10 text-violet-400',
    PROPOSAL: 'bg-amber-500/10 text-amber-400',
    WON: 'bg-emerald-500/10 text-emerald-400',
    LOST: 'bg-red-500/10 text-red-400',
    QUALIFICATION: 'bg-blue-500/10 text-blue-400',
    NEGOTIATION: 'bg-amber-500/10 text-amber-400',
    CLOSED_WON: 'bg-emerald-500/10 text-emerald-400',
    CLOSED_LOST: 'bg-red-500/10 text-red-400',
    // Client/Project statuses
    ACTIVE: 'bg-emerald-500/10 text-emerald-400',
    INACTIVE: 'bg-slate-500/10 text-slate-400',
    LEAD: 'bg-blue-500/10 text-blue-400',
    PROSPECT: 'bg-cyan-500/10 text-cyan-400',
    CHURNED: 'bg-red-500/10 text-red-400',
    PLANNING: 'bg-blue-500/10 text-blue-400',
    ON_HOLD: 'bg-amber-500/10 text-amber-400',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400',
    ARCHIVED: 'bg-slate-500/10 text-slate-400',
  }

  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', colors[status] || 'bg-muted text-muted-foreground')}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// Priority indicator
function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-slate-400',
    MEDIUM: 'bg-blue-400',
    HIGH: 'bg-amber-400',
    URGENT: 'bg-red-400',
  }
  return <span className={cn('w-2 h-2 rounded-full inline-block', colors[priority] || 'bg-slate-400')} />
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(num)
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// --- Creation confirmation card ---
const CREATION_LABELS: Record<string, { label: string; icon: typeof CheckSquare }> = {
  create_task: { label: 'Task creato', icon: CheckSquare },
  create_project: { label: 'Progetto creato', icon: FolderOpen },
  create_lead: { label: 'Lead creato', icon: Users },
  create_deal: { label: 'Trattativa creata', icon: Users },
  create_client: { label: 'Cliente creato', icon: Users },
  create_ticket: { label: 'Ticket creato', icon: Headphones },
  create_expense: { label: 'Spesa registrata', icon: Receipt },
  create_income: { label: 'Entrata registrata', icon: Receipt },
  create_quote: { label: 'Preventivo creato', icon: Receipt },
  create_calendar_event: { label: 'Evento creato', icon: Calendar },
}

function renderCreationCard(toolName: string, data: Record<string, unknown>) {
  const config = CREATION_LABELS[toolName]
  if (!config) return null
  const Icon = config.icon

  const name = (data.title || data.name || data.subject || data.number || data.description || 'Elemento') as string

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-medium text-emerald-400">{config.label}</span>
        </div>
        <p className="text-sm font-medium truncate mt-0.5">{name}</p>
      </div>
      {data.status ? <StatusBadge status={data.status as string} /> : null}
    </div>
  )
}

// --- Project list renderer ---
function renderProjectList(data: { projects: Array<Record<string, unknown>>; total: number }) {
  if (!data.projects?.length) return <p className="text-xs text-muted-foreground">Nessun progetto trovato</p>
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground font-medium">{data.total} progetti trovati</p>
      {data.projects.slice(0, 8).map((project: Record<string, unknown>) => (
        <div key={project.id as string} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-background/50">
          <FolderOpen className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="flex-1 truncate font-medium">{project.name as string}</span>
          {project.priority ? <PriorityDot priority={project.priority as string} /> : null}
          {project.progress !== undefined ? (
            <span className="text-[10px] text-muted-foreground">{project.progress as number}%</span>
          ) : null}
          {project.status ? <StatusBadge status={project.status as string} /> : null}
        </div>
      ))}
    </div>
  )
}

// --- Project details renderer ---
function renderProjectDetails(data: Record<string, unknown>) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium">{data.name as string}</span>
        {data.status ? <StatusBadge status={data.status as string} /> : null}
      </div>
      {data.description ? (
        <p className="text-xs text-muted-foreground">{(data.description as string).slice(0, 150)}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {data.budget !== undefined ? (
          <div className="p-1.5 rounded-lg bg-violet-500/10">
            <span className="text-[10px] text-muted-foreground">Budget</span>
            <p className="font-medium text-violet-400">{formatCurrency(data.budget as number)}</p>
          </div>
        ) : null}
        {data.progress !== undefined ? (
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <span className="text-[10px] text-muted-foreground">Progresso</span>
            <p className="font-medium text-blue-400">{data.progress as number}%</p>
          </div>
        ) : null}
      </div>
      {data.members && Array.isArray(data.members) && data.members.length > 0 ? (
        <p className="text-[10px] text-muted-foreground">
          {(data.members as Array<Record<string, unknown>>).length} membri
        </p>
      ) : null}
      {data.taskStats ? (
        <div className="text-[10px] text-muted-foreground">
          Task: {JSON.stringify(data.taskStats)}
        </div>
      ) : null}
    </div>
  )
}

// Render helpers for different tool types
function renderTaskList(data: { tasks: Array<Record<string, unknown>>; total: number }) {
  if (!data.tasks?.length) return <p className="text-xs text-muted-foreground">Nessun task trovato</p>
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground font-medium">{data.total} task trovati</p>
      {data.tasks.slice(0, 8).map((task: Record<string, unknown>) => (
        <div key={task.id as string} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-background/50">
          <PriorityDot priority={task.priority as string} />
          <span className="flex-1 truncate">{task.title as string}</span>
          <StatusBadge status={task.status as string} />
        </div>
      ))}
    </div>
  )
}

function renderLeadList(data: { leads: Array<Record<string, unknown>>; total: number }) {
  if (!data.leads?.length) return <p className="text-xs text-muted-foreground">Nessun lead trovato</p>
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground font-medium">{data.total} lead trovati</p>
      {data.leads.slice(0, 8).map((lead: Record<string, unknown>) => (
        <div key={lead.id as string} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-background/50">
          <span className="flex-1 truncate font-medium">{lead.name as string}</span>
          {lead.company ? <span className="text-muted-foreground truncate max-w-[100px]">{String(lead.company)}</span> : null}
          <StatusBadge status={lead.status as string} />
        </div>
      ))}
    </div>
  )
}

function renderDealList(data: { deals: Array<Record<string, unknown>>; total: number }) {
  if (!data.deals?.length) return <p className="text-xs text-muted-foreground">Nessuna trattativa trovata</p>
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground font-medium">{data.total} trattative</p>
      {data.deals.slice(0, 8).map((deal: Record<string, unknown>) => (
        <div key={deal.id as string} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-background/50">
          <span className="flex-1 truncate font-medium">{deal.title as string}</span>
          {deal.value ? <span className="text-emerald-400 font-medium">{formatCurrency(deal.value as number)}</span> : null}
          <StatusBadge status={deal.stage as string} />
        </div>
      ))}
    </div>
  )
}

function renderQuoteList(data: { quotes: Array<Record<string, unknown>>; total: number }) {
  if (!data.quotes?.length) return <p className="text-xs text-muted-foreground">Nessun preventivo trovato</p>
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground font-medium">{data.total} preventivi</p>
      {data.quotes.slice(0, 8).map((quote: Record<string, unknown>) => (
        <div key={quote.id as string} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-background/50">
          <span className="text-muted-foreground font-mono">{quote.number as string}</span>
          <span className="flex-1 truncate">{quote.title as string}</span>
          {quote.total ? <span className="font-medium">{formatCurrency(quote.total as string)}</span> : null}
          <StatusBadge status={quote.status as string} />
        </div>
      ))}
    </div>
  )
}

function renderTicketList(data: { tickets: Array<Record<string, unknown>>; total: number }) {
  if (!data.tickets?.length) return <p className="text-xs text-muted-foreground">Nessun ticket trovato</p>
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-muted-foreground font-medium">{data.total} ticket</p>
      {data.tickets.slice(0, 8).map((ticket: Record<string, unknown>) => (
        <div key={ticket.id as string} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-background/50">
          <PriorityDot priority={ticket.priority as string} />
          <span className="text-muted-foreground font-mono">{ticket.number as string}</span>
          <span className="flex-1 truncate">{ticket.subject as string}</span>
          <StatusBadge status={ticket.status as string} />
        </div>
      ))}
    </div>
  )
}

function renderFinancialSummary(data: Record<string, unknown>) {
  const current = data.currentMonth as { income: string; expenses: string; margin: string } | undefined
  const previous = data.previousMonth as { income: string; expenses: string; margin: string } | undefined
  const trend = data.trend as string

  if (!current) return null

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-center">
          <p className="text-[10px] text-emerald-400 font-medium">Entrate</p>
          <p className="text-sm font-bold text-emerald-400">{formatCurrency(current.income)}</p>
        </div>
        <div className="p-2 rounded-lg bg-red-500/10 text-center">
          <p className="text-[10px] text-red-400 font-medium">Spese</p>
          <p className="text-sm font-bold text-red-400">{formatCurrency(current.expenses)}</p>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/10 text-center">
          <p className="text-[10px] text-blue-400 font-medium">Margine</p>
          <p className="text-sm font-bold text-blue-400">{formatCurrency(current.margin)}</p>
        </div>
      </div>
      {previous && (
        <p className="text-[10px] text-muted-foreground">
          Mese precedente: {formatCurrency(previous.income)} entrate, {formatCurrency(previous.expenses)} spese
          {trend && <span className="ml-1">{trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'}</span>}
        </p>
      )}
    </div>
  )
}

function renderTimeEntries(data: { entries?: Array<Record<string, unknown>>; total?: number }) {
  if (!data.entries?.length) return <p className="text-xs text-muted-foreground">Nessuna registrazione trovata</p>
  const totalHours = data.entries.reduce((sum, e) => sum + (e.hours as number || 0), 0)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground font-medium">{data.total || data.entries.length} registrazioni</p>
        <p className="text-xs font-semibold text-violet-400">{totalHours.toFixed(1)}h totali</p>
      </div>
      {data.entries.slice(0, 6).map((entry: Record<string, unknown>, i: number) => (
        <div key={(entry.id as string) || i} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-background/50">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{entry.hours as number}h</span>
          <span className="flex-1 truncate text-muted-foreground">{entry.description as string || (entry.task as Record<string, unknown>)?.title as string || '—'}</span>
          {entry.date ? <span className="text-[10px] text-muted-foreground">{formatDate(entry.date as string)}</span> : null}
        </div>
      ))}
    </div>
  )
}

function renderErrorCard(result: { error?: string }) {
  return (
    <div className="flex items-start gap-2.5 py-1">
      <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-red-400 mb-0.5">Operazione non riuscita</p>
        <p className="text-xs text-red-300/70">{result.error || 'Errore sconosciuto'}</p>
      </div>
    </div>
  )
}

function renderGenericResult(data: unknown) {
  if (!data) return null
  const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  if (str.length > 500) return <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap overflow-hidden max-h-40">{str.slice(0, 500)}...</pre>
  return <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap">{str}</pre>
}

// Tool name to icon mapping
function getToolIcon(toolName: string) {
  if (toolName.includes('project')) return FolderOpen
  if (toolName.includes('task')) return CheckSquare
  if (toolName.includes('lead') || toolName.includes('deal') || toolName.includes('client') || toolName.includes('contact') || toolName.includes('crm')) return Users
  if (toolName.includes('calendar') || toolName.includes('event') || toolName.includes('slot')) return Calendar
  if (toolName.includes('quote') || toolName.includes('expense') || toolName.includes('income') || toolName.includes('financial') || toolName.includes('monthly') || toolName.includes('recurring') || toolName.includes('invoice')) return Receipt
  if (toolName.includes('ticket')) return Headphones
  if (toolName.includes('time')) return Clock
  return CheckCircle2
}

// Module color for left border
function getModuleColor(toolName: string): string {
  if (toolName.includes('project')) return 'border-l-blue-400'
  if (toolName.includes('task')) return 'border-l-blue-400'
  if (toolName.includes('lead') || toolName.includes('deal') || toolName.includes('client') || toolName.includes('contact') || toolName.includes('crm')) return 'border-l-emerald-400'
  if (toolName.includes('quote') || toolName.includes('expense') || toolName.includes('income') || toolName.includes('financial') || toolName.includes('monthly') || toolName.includes('recurring') || toolName.includes('invoice')) return 'border-l-violet-400'
  if (toolName.includes('ticket')) return 'border-l-amber-400'
  if (toolName.includes('time')) return 'border-l-cyan-400'
  if (toolName.includes('calendar') || toolName.includes('event') || toolName.includes('slot')) return 'border-l-orange-400'
  return 'border-l-muted-foreground'
}

// Check if tool is a creation tool
function isCreationTool(toolName: string): boolean {
  return toolName in CREATION_LABELS
}

// Summary text for collapsed state
// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
function getResultSummary(toolName: string, result: { success: boolean; data?: unknown }): string {
  if (!result.success) return 'Errore'
  const data = result.data as Record<string, unknown> | undefined
  if (!data) return 'Completato'

  // Creation tools
  if (isCreationTool(toolName)) {
    const config = CREATION_LABELS[toolName]
    const name = (data.title || data.name || data.subject || data.number || '') as string
    return name ? `${config.label}: ${name}` : config.label
  }

  if (data.projects && Array.isArray(data.projects)) {
    const count = data.total !== undefined ? data.total : (data.projects as unknown[]).length
    return `${count} progetti trovati`
  }
  if (data.tasks && Array.isArray(data.tasks)) {
    const count = data.total !== undefined ? data.total : (data.tasks as unknown[]).length
    return `${count} task trovati`
  }
  if (data.leads && Array.isArray(data.leads)) {
    const count = data.total !== undefined ? data.total : (data.leads as unknown[]).length
    return `${count} lead trovati`
  }
  if (data.deals && Array.isArray(data.deals)) {
    const count = data.total !== undefined ? data.total : (data.deals as unknown[]).length
    return `${count} trattative`
  }
  if (data.quotes && Array.isArray(data.quotes)) {
    const count = data.total !== undefined ? data.total : (data.quotes as unknown[]).length
    return `${count} preventivi`
  }
  if (data.tickets && Array.isArray(data.tickets)) {
    const count = data.total !== undefined ? data.total : (data.tickets as unknown[]).length
    return `${count} ticket`
  }
  if (data.entries && Array.isArray(data.entries)) {
    const count = data.total !== undefined ? data.total : (data.entries as unknown[]).length
    return `${count} registrazioni ore`
  }
  if (data.currentMonth) return 'Riepilogo finanziario'
  if (data.total !== undefined) return `${data.total} risultati`

  // Project details
  if (toolName === 'get_project_details' && data.name) return data.name as string

  return 'Completato'
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
export function AiToolResultCard({ toolName, result, defaultExpanded = false }: AiToolResultCardProps) {
  const isCreation = isCreationTool(toolName)
  const isError = !result.success
  const [expanded, setExpanded] = useState(defaultExpanded || isCreation || isError)
   
  const Icon = isCreation ? Plus : getToolIcon(toolName)
  const summary = getResultSummary(toolName, result)

  // eslint-disable-next-line sonarjs/cognitive-complexity -- complex business logic
  const renderContent = () => {
    // Error card
    if (!result.success) {
      return renderErrorCard(result)
    }

    const data = result.data as Record<string, unknown>
    if (!data) return null

    // Creation confirmation cards
    if (isCreation) {
      return renderCreationCard(toolName, data)
    }

    // Route to specific renderer based on tool name
    if (toolName === 'list_projects' && data.projects) return renderProjectList(data as { projects: Array<Record<string, unknown>>; total: number })
    if (toolName === 'get_project_details' && data.name) return renderProjectDetails(data)
    if (toolName === 'list_tasks' && data.tasks) return renderTaskList(data as { tasks: Array<Record<string, unknown>>; total: number })
    if (toolName === 'list_leads' && data.leads) return renderLeadList(data as { leads: Array<Record<string, unknown>>; total: number })
    if ((toolName === 'list_deals') && data.deals) return renderDealList(data as { deals: Array<Record<string, unknown>>; total: number })
    if (toolName === 'list_quotes' && data.quotes) return renderQuoteList(data as { quotes: Array<Record<string, unknown>>; total: number })
    if (toolName === 'list_tickets' && data.tickets) return renderTicketList(data as { tickets: Array<Record<string, unknown>>; total: number })
    if (toolName === 'get_financial_summary' && data.currentMonth) return renderFinancialSummary(data)
    if ((toolName === 'list_time_entries' || toolName === 'get_time_summary') && data.entries) return renderTimeEntries(data as { entries: Array<Record<string, unknown>>; total: number })

    return renderGenericResult(data)
  }

  return (
    <div className={cn(
      'rounded-xl overflow-hidden border-l-2',
      isError
        ? 'bg-red-500/[0.04] border border-red-500/10'
        : isCreation
          ? 'bg-emerald-500/[0.04] border border-emerald-500/10'
          : 'bg-white/[0.02] border border-white/[0.06]',
      isError ? 'border-l-red-400' : isCreation ? 'border-l-emerald-400' : getModuleColor(toolName),
    )}>
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-white/[0.03] transition-colors"
      >
        <div className={cn(
          'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
          isError ? 'bg-red-500/10' : isCreation ? 'bg-emerald-500/10' : result.success ? 'bg-emerald-500/10' : 'bg-red-500/10',
        )}>
          {isError ? (
            <XCircle className="h-3 w-3 text-red-400" />
          ) : isCreation ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          ) : (
            <Icon className={cn('h-3 w-3', result.success ? 'text-emerald-400' : 'text-red-400')} />
          )}
        </div>
        <span className={cn(
          'flex-1 text-left font-medium',
          isError ? 'text-red-400/80' : isCreation ? 'text-emerald-400/80' : 'text-foreground/70',
        )}>
          {summary}
        </span>
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground/40 transition-transform', expanded && 'rotate-180')} />
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-white/[0.04]">
              {renderContent()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
