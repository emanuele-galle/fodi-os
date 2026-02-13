import { z } from 'zod'

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'Nome obbligatorio').max(100).optional(),
  lastName: z.string().min(1, 'Cognome obbligatorio').max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
})
