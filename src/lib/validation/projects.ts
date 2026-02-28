import { z } from 'zod'

// Accept both ISO datetime ("2024-01-15T00:00:00.000Z") and plain date ("2024-01-15")
const dateStringSchema = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Data non valida' }
)

export const createProjectSchema = z.object({
  workspaceId: z.string().uuid('Workspace ID non valido').optional(),
  clientId: z.string().uuid('Client ID non valido').optional(),
  name: z.string().min(1, 'Nome progetto obbligatorio').max(200),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  deadline: dateStringSchema.optional(),
  budgetAmount: z.number().min(0).optional(),
  budgetHours: z.number().int().min(0).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colore non valido').default('#6366F1'),
  isInternal: z.boolean().default(false),
})

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Nome progetto obbligatorio').max(200).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'REVIEW', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  budgetAmount: z.number().min(0).optional().nullable(),
  budgetHours: z.number().int().min(0).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colore non valido').optional(),
  clientId: z.string().uuid('Client ID non valido').optional().nullable(),
  workspaceId: z.string().uuid('Workspace ID non valido').optional().nullable(),
})

const createMilestoneSchema = z.object({
  name: z.string().min(1, 'Nome milestone obbligatorio').max(200),
  dueDate: z.string().datetime().optional(),
  status: z.string().default('pending'),
  sortOrder: z.number().int().min(0).default(0),
})
