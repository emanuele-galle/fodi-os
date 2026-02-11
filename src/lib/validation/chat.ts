import { z } from 'zod'

export const createChannelSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['PUBLIC', 'PRIVATE', 'DIRECT', 'PROJECT']).default('PUBLIC'),
  projectId: z.string().uuid('Project ID non valido').optional(),
  memberIds: z.array(z.string().uuid()).optional(),
})

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isArchived: z.boolean().optional(),
})

export const createMessageSchema = z.object({
  content: z.string().min(1, 'Messaggio obbligatorio').max(10000),
  type: z.enum(['TEXT', 'SYSTEM', 'FILE_LINK']).default('TEXT'),
  metadata: z.any().optional(),
})

export const addMembersSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'Almeno un utente richiesto'),
})
