import { z } from 'zod'

export const updateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email('Email non valida').optional(),
  company: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  service: z.string().max(200).optional().nullable(),
  message: z.string().optional(),
  source: z.string().max(100).optional(),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST']).optional(),
  notes: z.string().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
})

export const convertLeadSchema = z.object({
  companyName: z.string().min(1, 'Nome azienda obbligatorio').max(200),
  industry: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
  status: z.enum(['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE', 'CHURNED']).default('PROSPECT'),
})
