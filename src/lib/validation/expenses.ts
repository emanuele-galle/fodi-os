import { z } from 'zod'

export const createExpenseSchema = z.object({
  category: z.string().min(1, 'Categoria obbligatoria').max(100),
  description: z.string().min(1, 'Descrizione obbligatoria'),
  amount: z.number().min(0, 'Importo non valido'),
  date: z.string().date('Data non valida'),
  invoiceId: z.string().uuid('Invoice ID non valido').optional(),
  receipt: z.string().optional(),
})

export const updateExpenseSchema = z.object({
  category: z.string().min(1, 'Categoria obbligatoria').max(100).optional(),
  description: z.string().min(1, 'Descrizione obbligatoria').optional(),
  amount: z.number().min(0, 'Importo non valido').optional(),
  date: z.string().date('Data non valida').optional(),
  invoiceId: z.string().uuid('Invoice ID non valido').optional().nullable(),
  receipt: z.string().optional().nullable(),
})
