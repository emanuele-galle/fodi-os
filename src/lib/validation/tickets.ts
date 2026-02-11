import { z } from 'zod'

export const createTicketSchema = z.object({
  clientId: z.string().uuid('Client ID non valido'),
  projectId: z.string().uuid('Project ID non valido').optional(),
  subject: z.string().min(1, 'Oggetto obbligatorio').max(300),
  description: z.string().min(1, 'Descrizione obbligatoria'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  category: z.string().max(50).default('general'),
})

export const updateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().uuid('Assignee ID non valido').optional().nullable(),
  category: z.string().max(50).optional(),
})

export const createTicketCommentSchema = z.object({
  content: z.string().min(1, 'Contenuto obbligatorio'),
})
