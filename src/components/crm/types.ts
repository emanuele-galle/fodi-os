export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  role: string | null
  isPrimary: boolean
}

export interface Interaction {
  id: string
  type: string
  subject: string
  content: string | null
  date: string
  contactId: string | null
  contact: { id: string; firstName: string; lastName: string } | null
}

export interface ClientProject {
  id: string
  name: string
  status: string
  priority: string
}

export interface ClientQuote {
  id: string
  number: string
  title: string
  status: string
  total: string
}

export interface ClientDetail {
  id: string
  companyName: string
  slug: string
  vatNumber: string | null
  fiscalCode: string | null
  pec: string | null
  sdi: string | null
  website: string | null
  industry: string | null
  source: string | null
  status: string
  notes: string | null
  tags: string[]
  totalRevenue: string
  createdAt: string
  contacts: Contact[]
  interactions: Interaction[]
  projects: ClientProject[]
  quotes: ClientQuote[]
}
