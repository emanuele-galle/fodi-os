import { z } from 'zod'

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid('Notification ID non valido')).optional(),
  all: z.boolean().optional(),
}).refine(
  (data) => data.all || (data.ids && data.ids.length > 0),
  { message: 'ids o all obbligatorio' }
)
