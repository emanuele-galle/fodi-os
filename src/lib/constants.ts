// Centralized constants — single source of truth for labels used across the app

// ─── System Roles ────────────────────────────────────────────────────────────

export const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DIR_COMMERCIALE', label: 'Dir. Commerciale' },
  { value: 'DIR_TECNICO', label: 'Dir. Tecnico' },
  { value: 'DIR_SUPPORT', label: 'Dir. Supporto' },
  { value: 'COMMERCIALE', label: 'Commerciale' },
  { value: 'PM', label: 'Resp. Progetto' },
  { value: 'DEVELOPER', label: 'Sviluppatore' },
  { value: 'CONTENT', label: 'Contenuti' },
  { value: 'SUPPORT', label: 'Assistenza' },
  { value: 'CLIENT', label: 'Cliente' },
]

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label])
)

export const ROLE_LABELS_SHORT: Record<string, string> = {
  ADMIN: 'Admin',
  DIR_COMMERCIALE: 'Dir. Comm.',
  DIR_TECNICO: 'Dir. Tech.',
  DIR_SUPPORT: 'Dir. Supp.',
  COMMERCIALE: 'Comm.',
  PM: 'PM',
  DEVELOPER: 'Dev',
  CONTENT: 'Content',
  SUPPORT: 'Support',
  CLIENT: 'Client',
}

export const ROLE_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  ADMIN: 'destructive',
  DIR_COMMERCIALE: 'warning',
  DIR_TECNICO: 'warning',
  DIR_SUPPORT: 'warning',
  COMMERCIALE: 'success',
  PM: 'default',
  DEVELOPER: 'default',
  CONTENT: 'outline',
  SUPPORT: 'outline',
  CLIENT: 'outline',
}

// ─── Task Status ─────────────────────────────────────────────────────────────

export const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'Da fare',
  IN_PROGRESS: 'In corso',
  IN_REVIEW: 'In revisione',
  DONE: 'Completata',
  CANCELLED: 'Cancellata',
}

// ─── Ticket Status ───────────────────────────────────────────────────────────

export const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aperto',
  IN_PROGRESS: 'In corso',
  WAITING_CLIENT: 'In attesa cliente',
  RESOLVED: 'Risolto',
  CLOSED: 'Chiuso',
}

// ─── Project Status ──────────────────────────────────────────────────────────

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Pianificazione',
  IN_PROGRESS: 'In Corso',
  ON_HOLD: 'In Pausa',
  REVIEW: 'Revisione',
  COMPLETED: 'Completato',
  CANCELLED: 'Annullato',
}

// ─── Priority ────────────────────────────────────────────────────────────────

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

// ─── Channel Member Roles (chat-specific, different from system roles) ───────

export const CHANNEL_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietario',
  ADMIN: 'Admin',
  MEMBER: 'Membro',
}
