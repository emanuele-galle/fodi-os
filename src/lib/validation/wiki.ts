import { z } from 'zod'

export const createWikiPageSchema = z.object({
  parentId: z.string().uuid('Parent ID non valido').optional().nullable(),
  title: z.string().min(1, 'Titolo obbligatorio').max(300),
  content: z.any().optional(),
  contentText: z.string().optional(),
  category: z.string().max(50).default('general'),
  icon: z.string().max(10).optional(),
})

export const updateWikiPageSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(300).optional(),
  content: z.any().optional(),
  contentText: z.string().optional().nullable(),
  category: z.string().max(50).optional(),
  icon: z.string().max(10).optional().nullable(),
  isPublished: z.boolean().optional(),
  changeNote: z.string().max(200).optional(),
})
