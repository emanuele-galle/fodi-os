'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle, ShieldAlert, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOOL_LABELS: Record<string, string> = {
  list_tasks: 'Cerco task',
  create_task: 'Creo task',
  update_task: 'Aggiorno task',
  get_task_details: 'Carico dettagli task',
  list_leads: 'Cerco lead',
  create_lead: 'Creo lead',
  update_lead_status: 'Aggiorno lead',
  list_deals: 'Cerco trattative',
  update_deal: 'Aggiorno trattativa',
  list_clients: 'Cerco clienti',
  log_interaction: 'Registro interazione',
  list_calendar_events: 'Carico eventi',
  create_calendar_event: 'Creo evento',
  find_free_slots: 'Cerco disponibilita',
  get_analytics_overview: 'Carico analytics',
  get_crm_stats: 'Carico statistiche CRM',
  get_team_workload: 'Analizzo carico team',
  search_platform: 'Cerco nella piattaforma',
  get_my_day_summary: 'Carico riepilogo giornata',
  search_contacts: 'Cerco contatti',
  get_project_status: 'Carico stato progetto',
  get_financial_summary: 'Carico dati finanziari',
  list_quotes: 'Cerco preventivi',
  get_quote_details: 'Carico preventivo',
  create_quote: 'Creo preventivo',
  update_quote_status: 'Aggiorno preventivo',
  list_expenses: 'Cerco spese',
  create_expense: 'Registro spesa',
  list_income: 'Cerco entrate',
  create_income: 'Registro entrata',
  get_monthly_report: 'Genero report mensile',
  list_recurring_invoices: 'Cerco fatture ricorrenti',
  list_invoice_monitoring: 'Controllo scadenze',
  list_tickets: 'Cerco ticket',
  get_ticket_details: 'Carico ticket',
  create_ticket: 'Creo ticket',
  update_ticket: 'Aggiorno ticket',
  list_time_entries: 'Cerco ore registrate',
  log_time: 'Registro ore',
  get_time_summary: 'Calcolo riepilogo ore',
}

interface AiToolIndicatorProps {
  name: string
  status?: string
  count?: number
}

export function AiToolIndicator({ name, status, count }: AiToolIndicatorProps) {
  const label = TOOL_LABELS[name] || name
  const [expanded, setExpanded] = useState(false)
  const isCompleted = status === 'SUCCESS'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all cursor-default',
        status === 'running' && 'bg-blue-500/10 text-blue-400 ai-shimmer',
        status === 'SUCCESS' && 'bg-emerald-500/10 text-emerald-400 cursor-pointer hover:bg-emerald-500/15',
        status === 'ERROR' && 'bg-red-500/10 text-red-400',
        status === 'DENIED' && 'bg-amber-500/10 text-amber-400',
      )}
      onClick={isCompleted ? () => setExpanded(!expanded) : undefined}
    >
      {status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === 'SUCCESS' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'ERROR' && <XCircle className="h-3 w-3" />}
      {status === 'DENIED' && <ShieldAlert className="h-3 w-3" />}
      <span>{label}{count && count > 1 ? ` ×${count}` : ''}</span>
      {isCompleted && (
        <ChevronDown className={cn(
          'h-3 w-3 transition-transform',
          expanded && 'rotate-180',
        )} />
      )}
    </div>
  )
}
