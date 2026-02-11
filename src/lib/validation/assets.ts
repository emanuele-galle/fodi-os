import { z } from 'zod'

export const createAssetSchema = z.object({
  projectId: z.string().uuid('Project ID non valido').optional(),
  fileName: z.string().min(1, 'Nome file obbligatorio').max(500),
  fileUrl: z.string().url('URL file non valido'),
  fileSize: z.number().int().min(0, 'Dimensione file non valida'),
  mimeType: z.string().min(1, 'Tipo MIME obbligatorio'),
  category: z.string().max(50).default('general'),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
})

export const updateAssetSchema = z.object({
  tags: z.array(z.string()).optional(),
  category: z.string().max(50).optional(),
  description: z.string().optional().nullable(),
})

export const createReviewSchema = z.object({
  dueDate: z.string().datetime().optional().nullable(),
})

export const createReviewCommentSchema = z.object({
  content: z.string().min(1, 'Contenuto obbligatorio'),
  timestamp: z.number().min(0).optional().nullable(),
})
