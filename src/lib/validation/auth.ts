import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username o email obbligatorio'),
  password: z.string().min(1, 'Password obbligatoria'),
})

export const passwordSchema = z.string()
  .min(8, 'Minimo 8 caratteri')
  .regex(/[A-Z]/, 'Almeno una lettera maiuscola')
  .regex(/[0-9]/, 'Almeno un numero')

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email non valida'),
})

export const verifyIpOtpSchema = z.object({
  userId: z.string().uuid('ID utente non valido'),
  otp: z.string().length(6, 'Il codice deve essere di 6 cifre').regex(/^\d{6}$/, 'Il codice deve contenere solo numeri'),
})
