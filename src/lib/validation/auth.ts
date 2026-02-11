import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria'),
})
