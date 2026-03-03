/* eslint-disable sonarjs/no-duplicate-string -- color tokens repeated across profile definitions */
import type { Role } from '@/generated/prisma/client'
import {
  Users, FolderKanban, Receipt, Clock, TrendingUp, AlertCircle,
  UserPlus, FilePlus2, TicketPlus, ClockPlus, ListTodo, MessageCircle,
  CheckCircle2, Target, Timer, FileText,
} from 'lucide-react'

// ── Profile types ────────────────────────────────────────────

export type DashboardProfile = 'executive' | 'operational' | 'commercial' | 'worker' | 'support' | 'client'

export type StatKey = 'clients' | 'projects' | 'quotes' | 'hours' | 'revenue' | 'tickets' | 'myTasks' | 'deadlines' | 'weekHours' | 'completedMonth' | 'teamHours' | 'tasksDone' | 'avgResponseTime' | 'resolvedTickets' | 'documents'

export type QuickActionKey = 'newClient' | 'newProject' | 'newQuote' | 'newTicket' | 'logHours' | 'newTask' | 'newLead' | 'chat'

type WidgetKey = 'forYou' | 'tasksDeadline' | 'operative' | 'financial' | 'pipeline' | 'teamActivity' | 'activityTimeline' | 'stickyNotes'

type ChartKey = 'revenue' | 'cashFlow' | 'pipelineFunnel' | 'activityTrend'

// ── Role → Profile mapping ───────────────────────────────────

const ROLE_TO_PROFILE: Record<Role, DashboardProfile> = {
  ADMIN: 'executive',
  DIR_COMMERCIALE: 'executive',
  DIR_TECNICO: 'operational',
  DIR_SUPPORT: 'operational',
  COMMERCIALE: 'commercial',
  PM: 'worker',
  DEVELOPER: 'worker',
  CONTENT: 'worker',
  SUPPORT: 'support',
  CLIENT: 'client',
}

export function getDashboardProfile(role: Role): DashboardProfile {
  return ROLE_TO_PROFILE[role] ?? 'worker'
}

// ── Stat definitions ─────────────────────────────────────────

interface StatDefinition {
  key: StatKey
  label: string
  icon: typeof Users
  color: string
  href: string
}

export const STAT_DEFINITIONS: Record<StatKey, StatDefinition> = {
  clients: { key: 'clients', label: 'Clienti Attivi', icon: Users, color: 'text-primary', href: '/crm?status=ACTIVE' },
  projects: { key: 'projects', label: 'Progetti in Corso', icon: FolderKanban, color: 'text-accent', href: '/projects?status=IN_PROGRESS' },
  quotes: { key: 'quotes', label: 'Preventivi Aperti', icon: Receipt, color: 'text-[var(--color-warning)]', href: '/erp/quotes?status=SENT' },
  hours: { key: 'hours', label: 'Ore Questa Settimana', icon: Clock, color: 'text-muted', href: '/time' },
  revenue: { key: 'revenue', label: 'Fatturato Mese', icon: TrendingUp, color: 'text-accent', href: '/erp/reports' },
  tickets: { key: 'tickets', label: 'Ticket Aperti', icon: AlertCircle, color: 'text-destructive', href: '/support' },
  myTasks: { key: 'myTasks', label: 'I Miei Task', icon: ListTodo, color: 'text-primary', href: '/tasks' },
  deadlines: { key: 'deadlines', label: 'Scadenze Vicine', icon: Timer, color: 'text-[var(--color-warning)]', href: '/tasks' },
  weekHours: { key: 'weekHours', label: 'Ore Settimana', icon: Clock, color: 'text-muted', href: '/time' },
  completedMonth: { key: 'completedMonth', label: 'Completati Mese', icon: CheckCircle2, color: 'text-accent', href: '/tasks' },
  teamHours: { key: 'teamHours', label: 'Ore Team', icon: Clock, color: 'text-muted', href: '/time' },
  tasksDone: { key: 'tasksDone', label: 'Task Completati', icon: CheckCircle2, color: 'text-accent', href: '/tasks' },
  avgResponseTime: { key: 'avgResponseTime', label: 'Tempo Risposta', icon: Timer, color: 'text-[var(--color-warning)]', href: '/support' },
  resolvedTickets: { key: 'resolvedTickets', label: 'Ticket Risolti', icon: AlertCircle, color: 'text-accent', href: '/support' },
  documents: { key: 'documents', label: 'Documenti', icon: FileText, color: 'text-muted', href: '/projects' },
}

// ── Quick Action definitions ─────────────────────────────────

export interface QuickActionDefinition {
  key: QuickActionKey
  label: string
  description: string
  icon: typeof Users
  href: string
  color: string
  bg: string
  hoverBorder: string
}

export const QUICK_ACTION_DEFINITIONS: Record<QuickActionKey, QuickActionDefinition> = {
  newClient: { key: 'newClient', label: 'Nuovo Cliente', description: 'Aggiungi cliente', icon: UserPlus, href: '/crm', color: 'text-primary', bg: 'bg-primary/10', hoverBorder: 'hover:border-primary/30' },
  newProject: { key: 'newProject', label: 'Nuovo Progetto', description: 'Crea progetto', icon: FolderKanban, href: '/projects', color: 'text-accent', bg: 'bg-accent/10', hoverBorder: 'hover:border-accent/30' },
  newQuote: { key: 'newQuote', label: 'Nuovo Preventivo', description: 'Crea preventivo', icon: FilePlus2, href: '/erp/quotes/new', color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning)]/10', hoverBorder: 'hover:border-[var(--color-warning)]/30' },
  newTicket: { key: 'newTicket', label: 'Nuovo Ticket', description: 'Apri ticket', icon: TicketPlus, href: '/support', color: 'text-destructive', bg: 'bg-destructive/10', hoverBorder: 'hover:border-destructive/30' },
  logHours: { key: 'logHours', label: 'Registra Ore', description: 'Traccia tempo', icon: ClockPlus, href: '/time', color: 'text-primary', bg: 'bg-primary/10', hoverBorder: 'hover:border-primary/30' },
  newTask: { key: 'newTask', label: 'Nuovo Task', description: 'Crea task', icon: ListTodo, href: '/tasks', color: 'text-accent', bg: 'bg-accent/10', hoverBorder: 'hover:border-accent/30' },
  newLead: { key: 'newLead', label: 'Nuovo Lead', description: 'Aggiungi lead', icon: Target, href: '/crm', color: 'text-accent', bg: 'bg-accent/10', hoverBorder: 'hover:border-accent/30' },
  chat: { key: 'chat', label: 'Chat', description: 'Messaggi', icon: MessageCircle, href: '/chat', color: 'text-primary', bg: 'bg-primary/10', hoverBorder: 'hover:border-primary/30' },
}

// ── Profile configurations ───────────────────────────────────

interface ProfileConfig {
  stats: StatKey[]
  quickActions: QuickActionKey[]
  widgets: WidgetKey[]
  charts: ChartKey[]
  greeting: string
}

const PROFILE_CONFIGS: Record<DashboardProfile, ProfileConfig> = {
  executive: {
    stats: ['clients', 'projects', 'quotes', 'hours', 'revenue', 'tickets'],
    quickActions: ['newClient', 'newProject', 'newQuote', 'newTicket', 'logHours'],
    widgets: ['forYou', 'tasksDeadline', 'operative', 'financial', 'pipeline', 'teamActivity', 'activityTimeline', 'stickyNotes'],
    charts: ['revenue', 'cashFlow', 'pipelineFunnel', 'activityTrend'],
    greeting: 'Panoramica aziendale',
  },
  operational: {
    stats: ['projects', 'teamHours', 'tasksDone', 'tickets'],
    quickActions: ['newProject', 'newTask', 'newTicket', 'logHours'],
    widgets: ['forYou', 'tasksDeadline', 'operative', 'teamActivity', 'activityTimeline', 'stickyNotes'],
    charts: ['activityTrend'],
    greeting: 'Riepilogo operativo',
  },
  commercial: {
    stats: ['clients', 'quotes', 'revenue', 'hours'],
    quickActions: ['newClient', 'newQuote', 'newLead', 'logHours'],
    widgets: ['forYou', 'tasksDeadline', 'pipeline', 'financial', 'activityTimeline'],
    charts: ['revenue', 'pipelineFunnel'],
    greeting: 'La tua area commerciale',
  },
  worker: {
    stats: ['myTasks', 'deadlines', 'weekHours', 'completedMonth'],
    quickActions: ['newTask', 'logHours', 'chat'],
    widgets: ['forYou', 'tasksDeadline', 'operative', 'stickyNotes'],
    charts: ['activityTrend'],
    greeting: 'I tuoi task di oggi',
  },
  support: {
    stats: ['tickets', 'myTasks', 'avgResponseTime', 'resolvedTickets'],
    quickActions: ['newTicket', 'logHours'],
    widgets: ['forYou', 'tasksDeadline', 'activityTimeline'],
    charts: [],
    greeting: 'I tuoi ticket',
  },
  client: {
    stats: ['myTasks', 'documents'],
    quickActions: ['newTicket'],
    widgets: ['forYou', 'tasksDeadline'],
    charts: [],
    greeting: 'Stato dei tuoi progetti',
  },
}

export function getProfileConfig(role: Role): ProfileConfig {
  const profile = getDashboardProfile(role)
  return PROFILE_CONFIGS[profile]
}

export function getProfileGreeting(role: Role): string {
  const profile = getDashboardProfile(role)
  return PROFILE_CONFIGS[profile].greeting
}

