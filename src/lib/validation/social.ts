import { z } from 'zod'

export const createSocialPostSchema = z.object({
  platform: z.string().min(1, 'Piattaforma obbligatoria').max(50),
  content: z.string().min(1, 'Contenuto obbligatorio'),
  mediaUrls: z.array(z.string().url('URL media non valido')).default([]),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'failed']).default('draft'),
})

export const updateSocialPostSchema = z.object({
  content: z.string().min(1, 'Contenuto obbligatorio').optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  mediaUrls: z.array(z.string().url('URL media non valido')).optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'failed']).optional(),
})
