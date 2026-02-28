'use client'

import { Loader2, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOOL_LABELS: Record<string, string> = {
  list_tasks: 'Cerco task',
  create_task: 'Creo task',
  update_task: 'Aggiorno task',
  get_task_details: 'Carico dettagli task',
  add_task_comment: 'Aggiungo commento',
  delete_task: 'Elimino task',
  list_leads: 'Cerco lead',
  create_lead: 'Creo lead',
  update_lead_status: 'Aggiorno lead',
  list_deals: 'Cerco trattative',
  create_deal: 'Creo trattativa',
  update_deal: 'Aggiorno trattativa',
  list_clients: 'Cerco clienti',
  create_client: 'Creo cliente',
  update_client: 'Aggiorno cliente',
  log_interaction: 'Registro interazione',
  list_calendar_events: 'Carico eventi',
  create_calendar_event: 'Creo evento',
  update_calendar_event: 'Aggiorno evento',
  delete_calendar_event: 'Elimino evento',
  find_free_slots: 'Cerco disponibilità',
  get_analytics_overview: 'Carico analytics',
  get_crm_stats: 'Carico statistiche CRM',
  get_team_workload: 'Analizzo carico team',
  search_platform: 'Cerco nella piattaforma',
  get_my_day_summary: 'Carico riepilogo giornata',
  search_contacts: 'Cerco contatti',
  get_project_status: 'Carico stato progetto',
  list_projects: 'Cerco progetti',
  create_project: 'Creo progetto',
  update_project: 'Aggiorno progetto',
  get_project_details: 'Carico dettagli progetto',
  archive_project: 'Archivio progetto',
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

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border',
        status === 'running' && 'bg-blue-500/[0.07] text-blue-400 border-blue-500/10 ai-shimmer',
        status === 'SUCCESS' && 'bg-emerald-500/[0.07] text-emerald-400 border-emerald-500/10',
        status === 'ERROR' && 'bg-red-500/[0.07] text-red-400 border-red-500/10',
        status === 'DENIED' && 'bg-amber-500/[0.07] text-amber-400 border-amber-500/10',
      )}
    >
      {status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === 'SUCCESS' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'ERROR' && <XCircle className="h-3 w-3" />}
      {status === 'DENIED' && <ShieldAlert className="h-3 w-3" />}
      <span>{label}{count && count > 1 ? ` ×${count}` : ''}</span>
    </span>
  )
}
