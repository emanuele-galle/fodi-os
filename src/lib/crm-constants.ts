// CRM shared constants - used by crm/page.tsx, crm/[clientId]/page.tsx, crm/leads/page.tsx
import { Phone, Mail, Calendar, FileText, MessageSquare, Globe } from 'lucide-react'

export const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'ACTIVE', label: 'Attivo' },
  { value: 'INACTIVE', label: 'Inattivo' },
  { value: 'CHURNED', label: 'Perso' },
]

export const STATUS_LABELS: Record<string, string> = {
  LEAD: 'Lead',
  PROSPECT: 'Prospect',
  ACTIVE: 'Attivo',
  INACTIVE: 'Inattivo',
  CHURNED: 'Perso',
}

export const INDUSTRY_OPTIONS = [
  { value: '', label: 'Seleziona settore' },
  { value: 'tech', label: 'Tecnologia' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'retail', label: 'Retail' },
  { value: 'healthcare', label: 'Sanita' },
  { value: 'finance', label: 'Finanza' },
  { value: 'manufacturing', label: 'Manifattura' },
  { value: 'services', label: 'Servizi' },
  { value: 'other', label: 'Altro' },
]

export const SOURCE_OPTIONS = [
  { value: '', label: 'Seleziona fonte' },
  { value: 'website', label: 'Sito Web' },
  { value: 'referral', label: 'Referral' },
  { value: 'social', label: 'Social Media' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'event', label: 'Evento' },
  { value: 'other', label: 'Altro' },
]

export const INTERACTION_TYPES = [
  { value: 'CALL', label: 'Chiamata' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Riunione' },
  { value: 'NOTE', label: 'Nota' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SOCIAL', label: 'Social' },
]

export const INTERACTION_ICONS: Record<string, typeof Phone> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Calendar,
  NOTE: FileText,
  WHATSAPP: MessageSquare,
  SOCIAL: Globe,
}

export const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
}

export const LEAD_STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'NEW', label: 'Nuovo' },
  { value: 'CONTACTED', label: 'Contattato' },
  { value: 'QUALIFIED', label: 'Qualificato' },
  { value: 'PROPOSAL_SENT', label: 'Proposta Inviata' },
  { value: 'CONVERTED', label: 'Convertito' },
  { value: 'LOST', label: 'Perso' },
]

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'Nuovo',
  CONTACTED: 'Contattato',
  QUALIFIED: 'Qualificato',
  PROPOSAL_SENT: 'Proposta Inviata',
  CONVERTED: 'Convertito',
  LOST: 'Perso',
}
