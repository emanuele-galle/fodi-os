import { z } from 'zod'

export const createClientSchema = z.object({
  companyName: z.string().min(1, 'Nome azienda obbligatorio').max(200),
  vatNumber: z.string().max(20).optional(),
  fiscalCode: z.string().max(20).optional(),
  pec: z.string().email('PEC non valida').optional().or(z.literal('')),
  sdi: z.string().max(7).optional(),
  website: z.string().url('URL non valido').optional().or(z.literal('')),
  industry: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
  status: z.enum(['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED']).default('LEAD'),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

export const updateClientSchema = z.object({
  companyName: z.string().min(1, 'Nome azienda obbligatorio').max(200).optional(),
  vatNumber: z.string().max(20).optional().nullable(),
  fiscalCode: z.string().max(20).optional().nullable(),
  pec: z.string().email('PEC non valida').optional().nullable().or(z.literal('')),
  sdi: z.string().max(7).optional().nullable(),
  website: z.string().url('URL non valido').optional().nullable().or(z.literal('')),
  industry: z.string().max(100).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  status: z.enum(['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED']).optional(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
})

export const createContactSchema = z.object({
  firstName: z.string().min(1, 'Nome obbligatorio').max(100),
  lastName: z.string().min(1, 'Cognome obbligatorio').max(100),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  role: z.string().max(100).optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional(),
})

export const createInteractionSchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'WHATSAPP', 'SOCIAL'], {
    error: 'Tipo interazione obbligatorio',
  }),
  subject: z.string().min(1, 'Oggetto obbligatorio').max(300),
  content: z.string().optional(),
  contactId: z.string().uuid('ID contatto non valido').optional(),
  date: z.string().datetime().optional(),
})
