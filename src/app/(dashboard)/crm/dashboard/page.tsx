'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useFetch } from '@/hooks/useFetch'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/lib/utils'
import { STATUS_LABELS, INTERACTION_ICONS, LEAD_STATUS_LABELS } from '@/lib/crm-constants'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Euro,
  UserPlus,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  CheckSquare,
  Target,
  CalendarClock,
} from 'lucide-react'

const DealsFunnelChart = dynamic(() => import('@/components/crm/CrmCharts').then(m => ({ default: m.DealsFunnelChart })), { ssr: false })
const WonDealsChart = dynamic(() => import('@/components/crm/CrmCharts').then(m => ({ default: m.WonDealsChart })), { ssr: false })
const InteractionsByTypeChart = dynamic(() => import('@/components/crm/CrmCharts').then(m => ({ default: m.InteractionsByTypeChart })), { ssr: false })

interface StatsData {
  totalClients: number
  clientsByStatus: Record<string, number>
  totalRevenue: string
  newClientsThisMonth: number
  newClientsLastMonth: number
  interactionsThisMonth: number
  interactionsLastMonth: number
  recentInteractions: {
    id: string
    type: string
    subject: string | null
    date: string
    client: { id: string; companyName: string }
  }[]
  topClientsByRevenue: {
    id: string
    companyName: string
    totalRevenue: number | string
    status: string
  }[]
  neglectedClients: {
    id: string
    companyName: string
    status: string
    interactions: { date: string }[]
  }[]
  dealsByStage: { stage: string; count: number; value: number }[]
  wonDealsMonthly: { month: string; count: number; value: number }[]
  interactionsByType: { type: string; count: number }[]
  conversionRate: number
  totalPipelineValue: string
  leadsByStatus: Record<string, number>
  avgDealValue: string
  overdueTasksCount: number
  dealsClosingSoon: {
    id: string
    title: string
    value: string | number
    stage: string
    expectedCloseDate: string
    client?: { id: string; companyName: string } | null
  }[]
}

interface TaskItem {
  id: string
  title: string
  dueDate: string | null
  priority: string
  status: string
  client?: { id: string; companyName: string } | null
}

interface DealItem {
  id: string
  title: string
  value: string | number
  stage: string
  probability: number
  client?: { id: string; companyName: string } | null
}

const DEAL_STAGE_LABELS: Record<string, string> = {
  QUALIFICATION: 'Qualificazione',
  PROPOSAL: 'Proposta',
  NEGOTIATION: 'Negoziazione',
  CLOSED_WON: 'Chiusa Vinta',
  CLOSED_LOST: 'Chiusa Persa',
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'text-red-500',
  HIGH: 'text-amber-500',
  MEDIUM: 'text-blue-500',
  LOW: 'text-zinc-400',
}

const STATUS_BAR_COLORS: Record<string, string> = {
  LEAD: 'bg-blue-500',
  PROSPECT: 'bg-amber-500',
  ACTIVE: 'bg-emerald-500',
  INACTIVE: 'bg-zinc-400',
  CHURNED: 'bg-red-500',
}

const STATUS_ORDER = ['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED']

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span className="text-xs text-muted">--</span>
  if (previous === 0) return (
    <span className="flex items-center gap-0.5 text-xs text-emerald-500">
      <TrendingUp className="h-3 w-3" /> Nuovo
    </span>
  )
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct >= 0) return (
    <span className="flex items-center gap-0.5 text-xs text-emerald-500">
      <TrendingUp className="h-3 w-3" /> +{pct}%
    </span>
  )
  return (
    <span className="flex items-center gap-0.5 text-xs text-red-400">
      <TrendingDown className="h-3 w-3" /> {pct}%
    </span>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function CrmDashboardPage() {
  const { data: statsRaw, loading } = useFetch<{ success: boolean; data: StatsData }>('/api/crm/stats')
  const { data: tasksRaw } = useFetch<{ success: boolean; data?: TaskItem[]; items?: TaskItem[] }>(
    '/api/tasks?mine=true&status=TODO,IN_PROGRESS&limit=5&sort=dueDate&order=asc'
  )
  const { data: dealsRaw } = useFetch<{ success: boolean; data?: DealItem[]; items?: DealItem[] }>(
    '/api/deals?limit=100'
  )

  const stats = statsRaw?.success ? statsRaw.data : null
  const myTasks = tasksRaw?.success ? (tasksRaw.data || tasksRaw.items || []).slice(0, 5) : []
  const deals = dealsRaw?.success ? (dealsRaw.data || dealsRaw.items || []) : []

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Dashboard CRM</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
          <Card><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Dashboard CRM</h1>
        <Card><CardContent><p className="text-muted">Impossibile caricare le statistiche.</p></CardContent></Card>
      </div>
    )
  }

  const activeClients = stats.clientsByStatus['ACTIVE'] || 0
  const totalStatusCount = Object.values(stats.clientsByStatus).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard CRM</h1>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link href="/crm?action=new" className="bg-card border border-border/40 rounded-lg px-3 py-2 text-sm flex items-center hover:bg-secondary/50 transition-colors">
          <UserPlus className="h-4 w-4 mr-1.5" /> Nuovo Cliente
        </Link>
        <Link href="/crm/leads?action=new" className="bg-card border border-border/40 rounded-lg px-3 py-2 text-sm flex items-center hover:bg-secondary/50 transition-colors">
          <Users className="h-4 w-4 mr-1.5" /> Nuovo Lead
        </Link>
        <Link href="/crm/pipeline?action=new" className="bg-card border border-border/40 rounded-lg px-3 py-2 text-sm flex items-center hover:bg-secondary/50 transition-colors">
          <TrendingUp className="h-4 w-4 mr-1.5" /> Nuova Opportunita
        </Link>
        <Link href="/crm/tasks?action=new" className="bg-card border border-border/40 rounded-lg px-3 py-2 text-sm flex items-center hover:bg-secondary/50 transition-colors">
          <CheckSquare className="h-4 w-4 mr-1.5" /> Nuova Attivita
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted">Clienti Totali</p>
              <p className="text-2xl font-bold">{stats.totalClients}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted">Clienti Attivi</p>
              <p className="text-2xl font-bold">{activeClients}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-500/10">
              <Euro className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted">Revenue Totale</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-purple-500/10">
              <UserPlus className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-xs text-muted">Nuovi Questo Mese</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.newClientsThisMonth}</p>
                <TrendIndicator current={stats.newClientsThisMonth} previous={stats.newClientsLastMonth} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-500/10">
              <Target className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-muted">Valore Pipeline</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalPipelineValue)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted">Tasso Conversione</p>
              <p className="text-2xl font-bold">{stats.conversionRate}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${stats.overdueTasksCount > 0 ? 'bg-red-500/10' : 'bg-zinc-500/10'}`}>
              <AlertTriangle className={`h-5 w-5 ${stats.overdueTasksCount > 0 ? 'text-red-500' : 'text-zinc-400'}`} />
            </div>
            <div>
              <p className="text-xs text-muted">Attivita Scadute</p>
              <p className={`text-2xl font-bold ${stats.overdueTasksCount > 0 ? 'text-red-500' : ''}`}>{stats.overdueTasksCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-cyan-500/10">
              <Euro className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-xs text-muted">Valore Medio Deal</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.avgDealValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline */}
        <Card>
          <CardContent>
            <h2 className="text-sm font-semibold mb-4">Pipeline</h2>
            <div className="space-y-3">
              {STATUS_ORDER.map((status) => {
                const count = stats.clientsByStatus[status] || 0
                const pct = totalStatusCount > 0 ? (count / totalStatusCount) * 100 : 0
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">{STATUS_LABELS[status] || status}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/20 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${STATUS_BAR_COLORS[status] || 'bg-zinc-400'}`}
                        style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent>
            <h2 className="text-sm font-semibold mb-4">Attivita Recenti</h2>
            {stats.recentInteractions.length === 0 ? (
              <p className="text-xs text-muted">Nessuna attivita recente.</p>
            ) : (
              <div className="space-y-3">
                {stats.recentInteractions.map((interaction) => {
                  const IconComponent = INTERACTION_ICONS[interaction.type]
                  return (
                    <div key={interaction.id} className="flex items-start gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted/20 flex-shrink-0 mt-0.5">
                        {IconComponent ? <IconComponent className="h-3.5 w-3.5 text-muted" /> : <Clock className="h-3.5 w-3.5 text-muted" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/crm/${interaction.client.id}`} className="text-sm font-medium hover:underline truncate">
                            {interaction.client.companyName}
                          </Link>
                          <Badge status={interaction.type} className="text-[10px]">{interaction.type}</Badge>
                        </div>
                        <p className="text-xs text-muted truncate">{interaction.subject || 'Nessun oggetto'}</p>
                        <p className="text-[11px] text-muted/60 mt-0.5">
                          {new Date(interaction.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads Overview & Deals Closing Soon */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads by Status */}
        <Card>
          <CardContent>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Lead per Stato
            </h2>
            {Object.keys(stats.leadsByStatus).length === 0 ? (
              <p className="text-xs text-muted">Nessun lead presente.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(LEAD_STATUS_LABELS).map(([status, label]) => {
                  const count = stats.leadsByStatus[status] || 0
                  if (count === 0) return null
                  const colors: Record<string, string> = {
                    NEW: 'bg-blue-500/15 text-blue-500',
                    CONTACTED: 'bg-amber-500/15 text-amber-500',
                    QUALIFIED: 'bg-emerald-500/15 text-emerald-500',
                    PROPOSAL_SENT: 'bg-purple-500/15 text-purple-500',
                    CONVERTED: 'bg-green-500/15 text-green-500',
                    LOST: 'bg-red-500/15 text-red-500',
                  }
                  return (
                    <div key={status} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/10">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || 'bg-zinc-500/15 text-zinc-400'}`}>
                          {label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span className="text-xs text-muted">Totale Lead</span>
                  <span className="text-sm font-bold">{Object.values(stats.leadsByStatus).reduce((a, b) => a + b, 0)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deals Closing Soon */}
        <Card>
          <CardContent>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-500" />
              Opportunita in Scadenza (7gg)
            </h2>
            {stats.dealsClosingSoon.length === 0 ? (
              <p className="text-xs text-muted">Nessuna opportunita in scadenza nei prossimi 7 giorni.</p>
            ) : (
              <div className="space-y-2">
                {stats.dealsClosingSoon.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/crm/pipeline`}
                    className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/10 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{deal.title}</p>
                      {deal.client && (
                        <p className="text-[11px] text-muted truncate">{deal.client.companyName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-emerald-500">{formatCurrency(deal.value)}</span>
                      <span className="text-[11px] text-muted">
                        {new Date(deal.expectedCloseDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {stats.dealsByStage.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DealsFunnelChart data={stats.dealsByStage} />
          <WonDealsChart data={stats.wonDealsMonthly} />
        </div>
      )}

      {stats.interactionsByType.length > 0 && (
        <InteractionsByTypeChart data={stats.interactionsByType} />
      )}

      {/* Tasks & Deals Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* My Tasks */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-500" />
                Le Mie Attività
              </h2>
              <Link href="/crm/tasks" className="text-xs text-blue-500 hover:underline">Vedi tutte</Link>
            </div>
            {myTasks.length === 0 ? (
              <p className="text-xs text-muted">Nessuna attività in scadenza.</p>
            ) : (
              <div className="space-y-2">
                {myTasks.map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()
                  return (
                    <div key={task.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-lg leading-none ${PRIORITY_COLORS[task.priority] || 'text-zinc-400'}`}>•</span>
                        <span className="text-sm truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.client && (
                          <span className="text-[10px] text-muted truncate max-w-[80px]">{task.client.companyName}</span>
                        )}
                        {task.dueDate && (
                          <span className={`text-[11px] ${isOverdue ? 'text-red-500 font-medium' : 'text-muted'}`}>
                            {new Date(task.dueDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deal Pipeline Summary */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                Pipeline Opportunità
              </h2>
              <Link href="/crm/pipeline" className="text-xs text-blue-500 hover:underline">Vedi tutte</Link>
            </div>
            {deals.length === 0 ? (
              <p className="text-xs text-muted">Nessuna opportunità attiva.</p>
            ) : (() => {
              const openDeals = deals.filter(d => !['CLOSED_WON', 'CLOSED_LOST'].includes(d.stage))
              const wonDeals = deals.filter(d => d.stage === 'CLOSED_WON')
              const totalOpen = openDeals.reduce((sum, d) => sum + parseFloat(String(d.value || 0)), 0)
              const totalWon = wonDeals.reduce((sum, d) => sum + parseFloat(String(d.value || 0)), 0)
              const stageGroups = Object.entries(
                openDeals.reduce<Record<string, { count: number; value: number }>>((acc, d) => {
                  if (!acc[d.stage]) acc[d.stage] = { count: 0, value: 0 }
                  acc[d.stage].count++
                  acc[d.stage].value += parseFloat(String(d.value || 0))
                  return acc
                }, {})
              )
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold">{openDeals.length}</p>
                      <p className="text-[10px] text-muted">Aperte</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-500">{formatCurrency(totalOpen)}</p>
                      <p className="text-[10px] text-muted">Valore Pipeline</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-500">{formatCurrency(totalWon)}</p>
                      <p className="text-[10px] text-muted">Vinto</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {stageGroups.map(([stage, data]) => (
                      <div key={stage} className="flex items-center justify-between text-xs py-1">
                        <span className="text-muted">{DEAL_STAGE_LABELS[stage] || stage}</span>
                        <span className="font-medium">{data.count} ({formatCurrency(data.value)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Clients by Revenue */}
        <Card>
          <CardContent>
            <h2 className="text-sm font-semibold mb-4">Top Clienti per Revenue</h2>
            {stats.topClientsByRevenue.length === 0 ? (
              <p className="text-xs text-muted">Nessun dato disponibile.</p>
            ) : (
              <div className="space-y-2">
                {stats.topClientsByRevenue.map((client, idx) => (
                  <Link
                    key={client.id}
                    href={`/crm/${client.id}`}
                    className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/10 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted w-5 text-right">{idx + 1}.</span>
                      <span className="text-sm font-medium truncate">{client.companyName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-emerald-500">
                        {formatCurrency(client.totalRevenue)}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Neglected Clients */}
        <Card>
          <CardContent>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Clienti Trascurati
            </h2>
            {stats.neglectedClients.length === 0 ? (
              <p className="text-xs text-muted">Tutti i clienti attivi sono stati contattati negli ultimi 30 giorni.</p>
            ) : (
              <div className="space-y-2">
                {stats.neglectedClients.map((client) => {
                  const lastDate = client.interactions[0]?.date
                  return (
                    <Link
                      key={client.id}
                      href={`/crm/${client.id}`}
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/10 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{client.companyName}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted">
                          {lastDate
                            ? `Ultimo contatto: ${new Date(lastDate).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`
                            : 'Mai contattato'}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
