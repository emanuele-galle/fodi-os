import { z } from 'zod'

const dateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Data non valida' }
)

const lineItemSchema = z.object({
  description: z.string().min(1, 'Descrizione voce obbligatoria'),
  quantity: z.number().positive('Quantita deve essere positiva').default(1),
  unitPrice: z.number().min(0, 'Prezzo unitario non valido'),
})

export const createQuoteSchema = z.object({
  clientId: z.string().uuid('Client ID non valido'),
  projectId: z.string().uuid('Project ID non valido').optional(),
  title: z.string().min(1, 'Titolo obbligatorio').max(300),
  lineItems: z.array(lineItemSchema).min(1, 'Almeno una voce obbligatoria'),
  taxRate: z.number().min(0).max(100).default(22),
  discount: z.number().min(0).default(0),
  notes: z.string().optional(),
  validUntil: dateStringSchema.optional(),
})

export const updateQuoteSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(300).optional(),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'INVOICED']).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  validUntil: dateStringSchema.optional().nullable(),
  projectId: z.string().uuid('Project ID non valido').optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1, 'Almeno una voce obbligatoria').optional(),
})
