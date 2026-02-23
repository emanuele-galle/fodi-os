import { z } from 'zod'

export const createExpenseSchema = z.object({
  category: z.string().min(1, 'Categoria obbligatoria').max(100),
  description: z.string().min(1, 'Descrizione obbligatoria'),
  amount: z.number().min(0, 'Importo non valido'),
  date: z.string().date('Data non valida'),
  receipt: z.string().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
})

export const updateExpenseSchema = z.object({
  category: z.string().min(1, 'Categoria obbligatoria').max(100).optional(),
  description: z.string().min(1, 'Descrizione obbligatoria').optional(),
  amount: z.number().min(0, 'Importo non valido').optional(),
  date: z.string().date('Data non valida').optional(),
  receipt: z.string().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
})

export const createSubscriptionSchema = createExpenseSchema.extend({
  isRecurring: z.literal(true),
  frequency: z.enum(['monthly', 'quarterly', 'yearly', 'custom']),
  nextDueDate: z.string().date('Data scadenza non valida'),
  endDate: z.string().date('Data fine non valida').optional(),
  autoRenew: z.boolean().optional().default(true),
  provider: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
})

export const updateSubscriptionSchema = z.object({
  category: z.string().min(1).max(100).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  date: z.string().date().optional(),
  receipt: z.string().optional().nullable(),
  frequency: z.enum(['monthly', 'quarterly', 'yearly', 'custom']).optional(),
  nextDueDate: z.string().date().optional(),
  endDate: z.string().date().optional().nullable(),
  autoRenew: z.boolean().optional(),
  status: z.enum(['active', 'paused', 'cancelled', 'expired']).optional(),
  provider: z.string().max(200).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
})
