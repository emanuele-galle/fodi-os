import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(300),
  description: z.string().optional(),
  projectId: z.string().uuid('Project ID non valido').optional(),
  milestoneId: z.string().uuid('Milestone ID non valido').optional(),
  folderId: z.string().uuid('Folder ID non valido').optional(),
  assigneeId: z.string().uuid('Assignee ID non valido').optional(),
  assigneeIds: z.array(z.string().uuid()).default([]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  boardColumn: z.string().max(50).default('todo'),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string()).default([]),
  isPersonal: z.boolean().optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(300).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  boardColumn: z.string().max(50).optional(),
  assigneeId: z.string().uuid('Assignee ID non valido').optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  folderId: z.string().uuid('Folder ID non valido').optional().nullable(),
  milestoneId: z.string().uuid('Milestone ID non valido').optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().min(0).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  isPersonal: z.boolean().optional(),
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
