'use client'

import { AiAnimatedAvatar } from './AiAnimatedAvatar'

const TOOL_MESSAGES: Record<string, string> = {
  list_tasks: 'Sto cercando i tuoi task...',
  create_task: 'Sto creando il task...',
  update_task: 'Sto aggiornando il task...',
  get_task_details: 'Sto caricando i dettagli...',
  add_task_comment: 'Aggiungo un commento...',
  delete_task: 'Elimino il task...',
  list_leads: 'Analizzo i lead...',
  create_lead: 'Sto creando il lead...',
  update_lead_status: 'Sto aggiornando il lead...',
  list_deals: 'Cerco le trattative...',
  create_deal: 'Creo la trattativa...',
  update_deal: 'Aggiorno la trattativa...',
  list_clients: 'Cerco i clienti...',
  create_client: 'Creo il cliente...',
  update_client: 'Aggiorno il cliente...',
  log_interaction: 'Registro l\'interazione...',
  list_calendar_events: 'Controllo il calendario...',
  create_calendar_event: 'Creo l\'evento...',
  update_calendar_event: 'Aggiorno l\'evento...',
  delete_calendar_event: 'Elimino l\'evento...',
  find_free_slots: 'Cerco disponibilità...',
  get_analytics_overview: 'Carico le analytics...',
  get_crm_stats: 'Carico le statistiche...',
  get_team_workload: 'Analizzo il carico del team...',
  search_platform: 'Cerco nella piattaforma...',
  get_my_day_summary: 'Preparo il riepilogo...',
  search_contacts: 'Cerco i contatti...',
  get_project_status: 'Controllo lo stato...',
  list_projects: 'Cerco i progetti...',
  create_project: 'Creo il progetto...',
  update_project: 'Aggiorno il progetto...',
  get_project_details: 'Carico i dettagli progetto...',
  archive_project: 'Archivio il progetto...',
  list_quotes: 'Cerco preventivi...',
  get_quote_details: 'Carico il preventivo...',
  create_quote: 'Creo il preventivo...',
  list_expenses: 'Cerco le spese...',
  create_expense: 'Registro la spesa...',
  list_income: 'Cerco le entrate...',
  create_income: 'Registro l\'entrata...',
  get_monthly_report: 'Genero il report...',
  list_recurring_invoices: 'Cerco fatture ricorrenti...',
  list_invoice_monitoring: 'Controllo scadenze...',
  list_tickets: 'Cerco i ticket...',
  get_ticket_details: 'Carico il ticket...',
  create_ticket: 'Creo il ticket...',
  update_ticket: 'Aggiorno il ticket...',
  list_time_entries: 'Cerco le ore registrate...',
  log_time: 'Registro le ore...',
  get_time_summary: 'Calcolo il riepilogo ore...',
}

interface AiTypingIndicatorProps {
  activeToolName?: string
}

export function AiTypingIndicator({ activeToolName }: AiTypingIndicatorProps) {
  const contextMessage = activeToolName
    ? TOOL_MESSAGES[activeToolName] || 'Sto elaborando...'
    : 'Sto pensando...'

  return (
    <div className="flex gap-3 ai-bubble-in">
      <AiAnimatedAvatar size="sm" className="flex-shrink-0" />
      <div className="flex flex-col gap-1.5">
        <div className="rounded-2xl rounded-tl-md bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] px-4 py-3 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-400 to-purple-500 ai-wave-dot"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground/60 pl-1 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400/50 animate-pulse" />
          {contextMessage}
        </span>
      </div>
    </div>
  )
}
