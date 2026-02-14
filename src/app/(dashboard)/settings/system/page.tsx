'use client'

import { useState, useEffect } from 'react'
import {
  Users, FolderKanban, Briefcase, Server, ShieldCheck, Clock,
  Activity, Database, Cpu, HardDrive, Zap, ChevronDown, ChevronRight,
  GitBranch, Sparkles, Bug, Wrench, ArrowUpCircle,
} from 'lucide-react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface SystemStats {
  users: { total: number; active: number }
  clients: Record<string, number>
  projects: Record<string, number>
  recentLogins: {
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    avatarUrl: string | null
    lastLoginAt: string
  }[]
  app: { name: string; version: string; environment: string }
}

interface ChangelogEntry {
  version: string
  date: string
  sections: { title: string; icon: typeof Sparkles; items: string[] }[]
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.4.0',
    date: '2026-02-14',
    sections: [
      {
        title: 'Commerciale & ERP',
        icon: Sparkles,
        items: [
          'Modifica inline preventivi (titolo, voci, IVA, sconto, note, validità)',
          'Modifica inline fatture (titolo, voci, IVA, sconto, note, scadenza, metodo pagamento)',
          'Aggiunta/rimozione dinamica voci con ricalcolo totali in tempo reale',
          'Sistema PDF professionale unificato con logo, dati societari, footer e numerazione pagine',
          'Generazione PDF fatture (nuovo endpoint)',
          'Anteprima PDF in-app per preventivi e fatture',
        ],
      },
      {
        title: 'Presenze & Time Tracking',
        icon: Sparkles,
        items: [
          'Nuovo sistema Cartellino Presenze basato su sessioni di connessione',
          'Heartbeat automatico con rilevamento gap (5 min) per clock-in/out',
          'Riepilogo ore giornaliere, settimanali, utenti online',
          'Sessioni raggruppate per giorno con orario entrata/uscita',
          'Clock-out automatico al logout',
        ],
      },
      {
        title: 'Google Meet & Chiamate',
        icon: Sparkles,
        items: [
          'Notifiche push con vibrazione per chiamate Meet in arrivo',
          'Banner chiamata in-app con suoneria e pulsanti Rispondi/Rifiuta',
          'Notifica service worker con azioni "Rispondi" e "Rifiuta"',
          'Auto-dismiss dopo 30 secondi',
        ],
      },
      {
        title: 'Impostazioni & UI',
        icon: Sparkles,
        items: [
          'Pagina impostazioni ridisegnata con navigazione a sezioni (Profilo, Aspetto, Sicurezza, Notifiche, Integrazioni)',
          'Selettore tema visuale (Chiaro, Scuro, Mezzanotte)',
          'Cambio password con validazione',
          'Campo telefono nel profilo utente',
          'Google Drive: restrizione alla cartella FODI OS',
        ],
      },
      {
        title: 'Upload & File',
        icon: Sparkles,
        items: [
          'Rimosso limite dimensione file su tutti gli upload (progetti, chat, Drive)',
          'Barra di progresso reale per upload allegati progetto e Google Drive',
          'Upload basato su XMLHttpRequest con tracking percentuale',
        ],
      },
      {
        title: 'Bug Fix',
        icon: Bug,
        items: [
          'Fix creazione progetti: validazione date accetta formato YYYY-MM-DD',
          'Fix errore silenzioso creazione progetti: aggiunto feedback errore nel form',
          'Fix validazione date preventivi e fatture (stessa issue)',
          'Fix CSP che bloccava thumbnail Google Drive (lh3.googleusercontent.com)',
        ],
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-02-11',
    sections: [
      {
        title: 'Workspace & Progetti',
        icon: Sparkles,
        items: [
          'Workspace aziendali: Amministrativo, Commerciale, Tecnico, Clienti',
          'Filtro workspace nella pagina Azienda con tab dedicate',
          'Raggruppamento progetti per workspace nella vista Tutti',
          'Rimosso selettore workspace dai Progetti Clienti (assegnazione automatica)',
          'Menu rinominato: Progetti → Progetti Clienti',
          'Link rapido a Progetti Interni dalla pagina Clienti',
        ],
      },
      {
        title: 'Chat',
        icon: Sparkles,
        items: [
          'Selezione multipla messaggi con checkbox per eliminazione bulk',
          'Barra flottante con conteggio e azione Elimina selezionati',
          'Separazione Messaggi Diretti e Canali nella sidebar chat',
          'Sezioni dedicate con icone distinte (DM vs Canali)',
        ],
      },
      {
        title: 'Sicurezza',
        icon: Sparkles,
        items: [
          'Rate limiting login: max 5 tentativi/minuto per IP',
          'Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection',
          'Referrer-Policy e Permissions-Policy nel middleware',
          'Sanitizzazione HTML messaggi chat (anti-XSS)',
        ],
      },
      {
        title: 'Bug Fix',
        icon: Bug,
        items: [
          'Fix API /time-entries 404 (route mancante, ora con GET e POST)',
          'Fix API /projects 400 (workspaceId ora opzionale con fallback automatico)',
          'Fix favicon non visibile (aggiornato a PNG con gradiente gold)',
        ],
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-02-11',
    sections: [
      {
        title: 'Chat',
        icon: Sparkles,
        items: [
          'Chat privata (DM) tra membri del team',
          'Chat interna ai progetti con tab dedicata',
          'Emoji picker con 40 emoji comuni',
          'Upload file/immagini in chat con preview',
          'Modifica/eliminazione messaggi propri',
          'Rich text: link cliccabili, **bold**, *italic*, `code`',
          'Creazione canali migliorata con selezione membri',
        ],
      },
      {
        title: 'ERP & Finanze',
        icon: Sparkles,
        items: [
          'Creazione nuovo cliente inline nei preventivi',
          'Icona Euro nella sidebar e bottom nav',
        ],
      },
      {
        title: 'Task & Progetti',
        icon: Sparkles,
        items: [
          'Fix assegnazione task a staff (API mismatch)',
          'Upload e visualizzazione allegati nei task',
          'Modello TaskAttachment per gestione file',
        ],
      },
      {
        title: 'Notifiche',
        icon: Sparkles,
        items: [
          'Fix interfaccia + polling 30s + mark-as-read',
          'Notifiche cliccabili con navigazione',
          'Badge conteggio accurato nella topbar',
        ],
      },
      {
        title: 'Gestione Utenti & Team',
        icon: Sparkles,
        items: [
          'Invito nuovi utenti con password temporanea',
          'Modifica ruolo utente inline',
          'Attivazione/disattivazione utenti',
          'Ricerca e filtri per nome/email/ruolo',
          'Pagina Team con stato online/offline',
        ],
      },
      {
        title: 'Google Meet',
        icon: Sparkles,
        items: [
          'Quick Meet con invito partecipanti e durata',
          'API lista meeting con Meet link',
          'Card Meet interattive in chat',
          'Bottone Meet in topbar, team e progetti',
        ],
      },
      {
        title: 'UI & Layout',
        icon: Sparkles,
        items: [
          'Logo component light/dark con varianti tema',
          'Favicon premium con gradiente gold',
          'Fix sidebar full-height',
          'Miglioramenti responsive mobile/desktop',
        ],
      },
      {
        title: 'Bug Fix',
        icon: Bug,
        items: [
          'Fix logout automatico (refresh token + hook proattivo)',
          'Fix assegnazione task (API response mismatch)',
          'Fix notifiche (campo isRead vs readAt)',
          'Fix divider sidebar (opacity CSS)',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-02-10',
    sections: [
      {
        title: 'Release Iniziale',
        icon: Sparkles,
        items: [
          'Dashboard con grafici fatturato e pipeline',
          'CRM completo (clienti, contatti, pipeline kanban, leads)',
          'Project Management (progetti, task, Gantt, Kanban, time tracking)',
          'ERP (preventivi, fatture, spese, report, e-fattura)',
          'Knowledge Base (wiki con versioning e commenti)',
          'Content Management (asset library, review workflow)',
          'Supporto (ticketing con SLA e commenti)',
          'Chat team (canali, SSE real-time, @menzioni)',
          'Calendario (integrazione Google Calendar, Meet)',
          'Autenticazione (JWT, refresh token, RBAC, Google OAuth)',
          'Portal clienti (preventivi, progetti, documenti, ticket)',
          'Ricerca globale (Command Palette Cmd+K)',
          'PWA (service worker, manifest, installabile)',
          'Temi (light, dark, midnight)',
        ],
      },
    ],
  },
]

const CLIENT_STATUS_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  PROSPECT: 'Prospect',
  ACTIVE: 'Attivo',
  INACTIVE: 'Inattivo',
  CHURNED: 'Perso',
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Pianificazione',
  IN_PROGRESS: 'In Corso',
  ON_HOLD: 'In Pausa',
  REVIEW: 'Revisione',
  COMPLETED: 'Completato',
  CANCELLED: 'Annullato',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES: 'Commerciale',
  PM: 'Resp. Progetto',
  DEVELOPER: 'Sviluppatore',
  CONTENT: 'Contenuti',
  SUPPORT: 'Assistenza',
  CLIENT: 'Cliente',
}

const STATUS_BAR_COLORS: Record<string, string> = {
  LEAD: 'bg-indigo-500',
  PROSPECT: 'bg-amber-500',
  ACTIVE: 'bg-emerald-500',
  INACTIVE: 'bg-slate-400',
  CHURNED: 'bg-red-500',
  PLANNING: 'bg-indigo-500',
  IN_PROGRESS: 'bg-emerald-500',
  ON_HOLD: 'bg-amber-500',
  REVIEW: 'bg-purple-500',
  COMPLETED: 'bg-slate-400',
  CANCELLED: 'bg-red-500',
}

export default function SystemStatsPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({ '0.4.0': true })
  const [activeTab, setActiveTab] = useState<'overview' | 'changelog'>('overview')

  useEffect(() => {
    fetch('/api/system/stats')
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? 'Accesso non autorizzato' : 'Errore caricamento')
        return r.json()
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function toggleVersion(version: string) {
    setExpandedVersions((prev) => ({ ...prev, [version]: !prev[version] }))
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-xl md:text-2xl font-bold mb-2">Sistema</h1>
        <Card>
          <CardContent>
            <p className="text-sm text-destructive">{error || 'Errore nel caricamento dei dati.'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalClients = Object.values(stats.clients).reduce((s, v) => s + v, 0)
  const totalProjects = Object.values(stats.projects).reduce((s, v) => s + v, 0)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Sistema</h1>
              <p className="text-xs md:text-sm text-muted">Panoramica e informazioni di sistema</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-sm px-3 py-1">
            v{stats.app.version}
          </Badge>
          <Badge variant={stats.app.environment === 'production' ? 'success' : 'warning'} className="text-sm px-3 py-1">
            {stats.app.environment}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'overview'
              ? 'bg-card shadow-[var(--shadow-sm)] text-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <Activity className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
          Panoramica
        </button>
        <button
          onClick={() => setActiveTab('changelog')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'changelog'
              ? 'bg-card shadow-[var(--shadow-sm)] text-foreground'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <GitBranch className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
          Changelog
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-stagger">
            {[
              { label: 'Utenti', value: stats.users.active, sub: `${stats.users.total} totali, ${stats.users.active} attivi`, icon: Users, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
              { label: 'Clienti', value: totalClients, sub: `${stats.clients.ACTIVE || 0} attivi`, icon: Briefcase, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Progetti', value: totalProjects, sub: `${stats.projects.IN_PROGRESS || 0} in corso`, icon: FolderKanban, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
            ].map((stat) => (
              <Card key={stat.label} className="relative overflow-hidden">
                <CardContent className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted uppercase tracking-wider font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold mt-0.5">{stat.value}</p>
                    <p className="text-xs text-muted mt-0.5">{stat.sub}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clients by status */}
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 mb-5">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <CardTitle>Clienti per Stato</CardTitle>
                </div>
                <div className="space-y-4">
                  {Object.entries(stats.clients).map(([status, count]) => {
                    const pct = totalClients > 0 ? (count / totalClients) * 100 : 0
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium">{CLIENT_STATUS_LABELS[status] || status}</span>
                          <span className="text-sm text-muted font-mono">{count}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${STATUS_BAR_COLORS[status] || 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Projects by status */}
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 mb-5">
                  <FolderKanban className="h-4 w-4 text-primary" />
                  <CardTitle>Progetti per Stato</CardTitle>
                </div>
                <div className="space-y-4">
                  {Object.entries(stats.projects).map(([status, count]) => {
                    const pct = totalProjects > 0 ? (count / totalProjects) * 100 : 0
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium">{PROJECT_STATUS_LABELS[status] || status}</span>
                          <span className="text-sm text-muted font-mono">{count}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${STATUS_BAR_COLORS[status] || 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Recent logins */}
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 mb-5">
                  <Clock className="h-4 w-4 text-primary" />
                  <CardTitle>Ultimi Login</CardTitle>
                </div>
                {stats.recentLogins.length === 0 ? (
                  <p className="text-sm text-muted py-4">Nessun login recente.</p>
                ) : (
                  <div className="space-y-1">
                    {stats.recentLogins.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                        <Avatar
                          src={user.avatarUrl}
                          name={`${user.firstName} ${user.lastName}`}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-muted truncate">{user.email}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge variant="outline" className="text-[10px]">
                            {ROLE_LABELS[user.role] || user.role}
                          </Badge>
                          <p className="text-[10px] text-muted mt-1">
                            {formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true, locale: it })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* App info */}
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 mb-5">
                  <Zap className="h-4 w-4 text-primary" />
                  <CardTitle>Informazioni Sistema</CardTitle>
                </div>
                <div className="space-y-1">
                  {[
                    { icon: Server, label: 'Applicazione', value: stats.app.name },
                    { icon: ShieldCheck, label: 'Versione', value: `v${stats.app.version}`, badge: true },
                    { icon: Cpu, label: 'Ambiente', value: stats.app.environment, badgeVariant: stats.app.environment === 'production' ? 'success' as const : 'warning' as const },
                    { icon: Database, label: 'Database', value: 'PostgreSQL' },
                    { icon: HardDrive, label: 'Runtime', value: 'Next.js 16 + React 19' },
                    { icon: Activity, label: 'Real-time', value: 'SSE (Server-Sent Events)' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                      <item.icon className="h-4 w-4 text-muted flex-shrink-0" />
                      <span className="text-sm text-muted">{item.label}</span>
                      <span className="ml-auto text-sm font-medium">
                        {item.badge ? (
                          <Badge variant="default">{item.value}</Badge>
                        ) : item.badgeVariant ? (
                          <Badge variant={item.badgeVariant}>{item.value}</Badge>
                        ) : (
                          item.value
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Changelog */
        <div className="space-y-6 animate-stagger">
          {CHANGELOG.map((entry) => {
            const isExpanded = expandedVersions[entry.version]
            const isLatest = entry.version === CHANGELOG[0].version
            return (
              <Card key={entry.version} className={isLatest ? 'ring-1 ring-primary/10' : ''}>
                <CardContent>
                  <button
                    onClick={() => toggleVersion(entry.version)}
                    className="flex items-center justify-between w-full text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isLatest ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted'}`}>
                        <ArrowUpCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">v{entry.version}</h3>
                          {isLatest && (
                            <Badge variant="success" className="text-[10px]">Ultimo</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted">
                          {new Date(entry.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {' - '}{entry.sections.reduce((sum, s) => sum + s.items.length, 0)} modifiche
                        </p>
                      </div>
                    </div>
                    <div className="text-muted group-hover:text-foreground transition-colors">
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-5 space-y-5 animate-fade-in">
                      {entry.sections.map((section) => {
                        const SectionIcon = section.title === 'Bug Fix' ? Bug : section.title === 'Miglioramenti Tecnici' ? Wrench : Sparkles
                        return (
                          <div key={section.title}>
                            <div className="flex items-center gap-2 mb-2.5">
                              <SectionIcon className={`h-3.5 w-3.5 ${section.title === 'Bug Fix' ? 'text-red-500' : 'text-primary'}`} />
                              <h4 className="text-sm font-semibold">{section.title}</h4>
                            </div>
                            <ul className="space-y-1.5 ml-5.5">
                              {section.items.map((item, idx) => (
                                <li key={idx} className="text-sm text-muted flex items-start gap-2">
                                  <span className="text-primary/40 mt-1.5 flex-shrink-0">&#8226;</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
