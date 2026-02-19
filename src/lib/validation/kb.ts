import { z } from 'zod'

export const createWikiPageSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug non valido (usa solo lettere minuscole, numeri e trattini)').optional(),
  content: z.string().min(1, 'Contenuto obbligatorio'),
  excerpt: z.string().max(500).optional(),
  category: z.string().max(50).default('general'),
  tags: z.array(z.string().max(50)).max(20).default([]),
  isPublished: z.boolean().default(false),
  parentId: z.string().uuid().optional().nullable(),
})

export const updateWikiPageSchema = createWikiPageSchema.partial()
