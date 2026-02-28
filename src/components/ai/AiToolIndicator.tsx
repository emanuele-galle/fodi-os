'use client'

import { Loader2, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react'
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
  find_free_slots: 'Cerco disponibilità',
  get_analytics_overview: 'Carico analytics',
  get_crm_stats: 'Carico statistiche CRM',
  get_team_workload: 'Analizzo carico team',
  search_platform: 'Cerco nella piattaforma',
  get_my_day_summary: 'Carico riepilogo giornata',
  search_contacts: 'Cerco contatti',
  get_project_status: 'Carico stato progetto',
}

interface AiToolIndicatorProps {
  name: string
  status?: string
}

export function AiToolIndicator({ name, status }: AiToolIndicatorProps) {
  const label = TOOL_LABELS[name] || name

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs',
      status === 'running' && 'bg-blue-500/10 text-blue-400',
      status === 'SUCCESS' && 'bg-emerald-500/10 text-emerald-400',
      status === 'ERROR' && 'bg-red-500/10 text-red-400',
      status === 'DENIED' && 'bg-amber-500/10 text-amber-400',
    )}>
      {status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === 'SUCCESS' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'ERROR' && <XCircle className="h-3 w-3" />}
      {status === 'DENIED' && <ShieldAlert className="h-3 w-3" />}
      <span>{label}</span>
    </div>
  )
}
