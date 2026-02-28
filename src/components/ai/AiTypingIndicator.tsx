'use client'

import { motion } from 'motion/react'
import { Bot } from 'lucide-react'

const TOOL_MESSAGES: Record<string, string> = {
  list_tasks: 'Sto cercando i tuoi task...',
  create_task: 'Sto creando il task...',
  update_task: 'Sto aggiornando il task...',
  get_task_details: 'Sto caricando i dettagli...',
  list_leads: 'Analizzo i lead...',
  create_lead: 'Sto creando il lead...',
  update_lead_status: 'Sto aggiornando il lead...',
  list_deals: 'Cerco le trattative...',
  update_deal: 'Aggiorno la trattativa...',
  list_clients: 'Cerco i clienti...',
  log_interaction: 'Registro l\'interazione...',
  list_calendar_events: 'Controllo il calendario...',
  create_calendar_event: 'Creo l\'evento...',
  find_free_slots: 'Cerco disponibilita...',
  get_analytics_overview: 'Carico le analytics...',
  get_crm_stats: 'Carico le statistiche...',
  get_team_workload: 'Analizzo il carico del team...',
  search_platform: 'Cerco nella piattaforma...',
  get_my_day_summary: 'Preparo il riepilogo...',
  search_contacts: 'Cerco i contatti...',
  get_project_status: 'Controllo lo stato...',
  list_quotes: 'Cerco preventivi...',
  get_quote_details: 'Carico il preventivo...',
  create_quote: 'Creo il preventivo...',
  list_expenses: 'Cerco le spese...',
  list_income: 'Cerco le entrate...',
  get_monthly_report: 'Genero il report...',
  list_tickets: 'Cerco i ticket...',
  get_ticket_details: 'Carico il ticket...',
  create_ticket: 'Creo il ticket...',
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
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-violet-500/20 text-violet-400">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="rounded-2xl rounded-tl-md bg-muted px-4 py-3 flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground/60 pl-1">{contextMessage}</span>
      </div>
    </div>
  )
}
