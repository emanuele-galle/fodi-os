import { z } from 'zod'

const templateLineItemSchema = z.object({
  description: z.string().min(1, 'Descrizione voce obbligatoria'),
  quantity: z.number().positive('Quantita deve essere positiva').default(1),
  unitPrice: z.number().min(0, 'Prezzo unitario non valido'),
  sortOrder: z.number().int().min(0).default(0),
})

export const createQuoteTemplateSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(200),
  description: z.string().max(500).optional(),
  isGlobal: z.boolean().default(true),
  clientId: z.string().uuid().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().max(20).default('#3B82F6'),
  secondaryColor: z.string().max(20).default('#1E293B'),
  headerHtml: z.string().optional().nullable(),
  footerHtml: z.string().optional().nullable(),
  sections: z.array(z.object({
    title: z.string().min(1),
    content: z.string(),
    sortOrder: z.number().int().min(0).default(0),
  })).optional().nullable(),
  numberPrefix: z.string().max(10).default('Q'),
  numberFormat: z.string().max(50).default('{PREFIX}-{YYYY}-{NNN}'),
  defaultTaxRate: z.number().min(0).max(100).default(22),
  defaultDiscount: z.number().min(0).default(0),
  defaultNotes: z.string().optional().nullable(),
  defaultValidDays: z.number().int().min(1).max(365).default(30),
  termsAndConditions: z.string().optional().nullable(),
  lineItems: z.array(templateLineItemSchema).optional(),
})

export const updateQuoteTemplateSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  isGlobal: z.boolean().optional(),
  clientId: z.string().uuid().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  headerHtml: z.string().optional().nullable(),
  footerHtml: z.string().optional().nullable(),
  sections: z.array(z.object({
    title: z.string().min(1),
    content: z.string(),
    sortOrder: z.number().int().min(0).default(0),
  })).optional().nullable(),
  numberPrefix: z.string().max(10).optional(),
  numberFormat: z.string().max(50).optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  defaultDiscount: z.number().min(0).optional(),
  defaultNotes: z.string().optional().nullable(),
  defaultValidDays: z.number().int().min(1).max(365).optional(),
  termsAndConditions: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  lineItems: z.array(templateLineItemSchema).optional(),
})

export const createQuoteFromTemplateSchema = z.object({
  templateId: z.string().uuid('Template ID non valido'),
  clientId: z.string().uuid('Client ID non valido'),
  projectId: z.string().uuid('Project ID non valido').optional(),
  title: z.string().min(1, 'Titolo obbligatorio').max(300),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive().default(1),
    unitPrice: z.number().min(0),
  })).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
  validUntil: z.string().datetime().optional(),
})
