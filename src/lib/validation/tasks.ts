import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(300),
  description: z.string().optional(),
  projectId: z.string().uuid('Project ID non valido').optional(),
  milestoneId: z.string().uuid('Milestone ID non valido').optional(),
  folderId: z.string().uuid('Folder ID non valido').optional(),
  clientId: z.string().uuid('Client ID non valido').optional().nullable(),
  assigneeId: z.string().uuid('Assignee ID non valido').optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).default([]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  boardColumn: z.string().max(50).default('todo'),
  taskType: z.string().max(50).optional(),
  dueDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Data non valida').optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string()).default([]),
  isPersonal: z.boolean().optional(),
  parentId: z.string().uuid('Parent Task ID non valido').optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(300).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  boardColumn: z.string().max(50).optional(),
  assigneeId: z.string().uuid('Assignee ID non valido').optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  projectId: z.string().uuid('Project ID non valido').optional().nullable(),
  folderId: z.string().uuid('Folder ID non valido').optional().nullable(),
  milestoneId: z.string().uuid('Milestone ID non valido').optional().nullable(),
  dueDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Data non valida').optional().nullable(),
  estimatedHours: z.number().min(0).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  isPersonal: z.boolean().optional(),
  parentId: z.string().uuid('Parent Task ID non valido').optional().nullable(),
})

export const createTimeEntrySchema = z.object({
  taskId: z.string().uuid('Task ID non valido').optional(),
  projectId: z.string().uuid('Project ID non valido').optional(),
  date: z.string().date('Data non valida'),
  hours: z.number().positive('Le ore devono essere positive'),
  description: z.string().optional(),
  billable: z.boolean().default(true),
  hourlyRate: z.number().min(0).optional(),
})

export const updateTimeEntrySchema = z.object({
  hours: z.number().positive('Le ore devono essere positive').optional(),
  description: z.string().optional().nullable(),
  billable: z.boolean().optional(),
  hourlyRate: z.number().min(0).optional().nullable(),
  date: z.string().date('Data non valida').optional(),
  taskId: z.string().uuid('Task ID non valido').optional().nullable(),
  projectId: z.string().uuid('Project ID non valido').optional().nullable(),
})

export const recurrenceRuleSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']),
  interval: z.number().int().min(1).max(365).default(1),
  weekDays: z.array(z.number().int().min(0).max(6)).default([]),
  monthDay: z.number().int().min(1).max(31).optional().nullable(),
  startDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Data non valida'),
  endDate: z.string().refine((s) => !isNaN(Date.parse(s)), 'Data non valida').optional().nullable(),
  maxOccurrences: z.number().int().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
}).refine(
  (v) => v.frequency !== 'WEEKLY' || v.weekDays.length > 0,
  { message: 'Seleziona almeno un giorno della settimana', path: ['weekDays'] }
)

export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleSchema>
