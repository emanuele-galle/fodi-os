import { z } from 'zod'

export const createDealSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(300),
  description: z.string().optional(),
  value: z.number().min(0, 'Il valore deve essere positivo').default(0),
  stage: z.enum(['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).default('QUALIFICATION'),
  probability: z.number().min(0).max(100).default(50),
  expectedCloseDate: z.string().datetime().optional(),
  clientId: z.string().uuid('Client ID non valido'),
  contactId: z.string().uuid('Contact ID non valido').optional().nullable(),
})

export const updateDealSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(300).optional(),
  description: z.string().optional().nullable(),
  value: z.number().min(0).optional(),
  stage: z.enum(['QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional().nullable(),
  actualCloseDate: z.string().datetime().optional().nullable(),
  lostReason: z.string().optional().nullable(),
  contactId: z.string().uuid('Contact ID non valido').optional().nullable(),
})
