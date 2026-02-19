import { z } from 'zod'

const vatRates = ['0', '4', '10', '22'] as const
const deductibilityRates = ['0', '50', '100'] as const

// ─── Income ──────────────────────────────────────────────────
export const createIncomeSchema = z.object({
  isPaid: z.boolean().optional().default(false),
  clientName: z.string().min(1, 'Nome cliente obbligatorio'),
  date: z.string().date('Data non valida'),
  bankAccountId: z.string().uuid().optional().nullable(),
  businessEntityId: z.string().uuid().optional().nullable(),
  category: z.string().min(1, 'Categoria obbligatoria'),
  amount: z.number().min(0, 'Importo non valido'),
  vatRate: z.enum(vatRates).optional().default('22'),
  notes: z.string().max(1000).optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
})

export const updateIncomeSchema = createIncomeSchema.partial()

// ─── BankAccount ─────────────────────────────────────────────
export const createBankAccountSchema = z.object({
  name: z.string().min(1, 'Nome conto obbligatorio'),
  type: z.enum(['bank', 'credit_card', 'cash']).optional().default('bank'),
  icon: z.string().max(10).optional().nullable(),
  balance: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
})

export const updateBankAccountSchema = createBankAccountSchema.partial()

// ─── BusinessEntity ──────────────────────────────────────────
export const createBusinessEntitySchema = z.object({
  name: z.string().min(1, 'Nome attività obbligatorio'),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
})

export const updateBusinessEntitySchema = createBusinessEntitySchema.partial()

// ─── BankTransfer ────────────────────────────────────────────
export const createBankTransferSchema = z.object({
  date: z.string().date('Data non valida'),
  operation: z.string().min(1, 'Operazione obbligatoria'),
  fromAccountId: z.string().uuid('Conto origine obbligatorio'),
  toAccountId: z.string().uuid('Conto destinazione obbligatorio'),
  amount: z.number().min(0.01, 'Importo non valido'),
  notes: z.string().max(1000).optional().nullable(),
})

// ─── AccountingCategory ──────────────────────────────────────
export const createAccountingCategorySchema = z.object({
  name: z.string().min(1, 'Nome categoria obbligatorio'),
  type: z.enum(['income', 'expense']),
  icon: z.string().max(10).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
})

export const updateAccountingCategorySchema = createAccountingCategorySchema.partial()

// ─── Expense extended fields ─────────────────────────────────
export const expenseAdvancedFields = z.object({
  isPaid: z.boolean().optional(),
  supplierName: z.string().optional().nullable(),
  bankAccountId: z.string().uuid().optional().nullable(),
  businessEntityId: z.string().uuid().optional().nullable(),
  vatRate: z.enum(vatRates).optional().nullable(),
  deductibility: z.enum(deductibilityRates).optional().nullable(),
})
