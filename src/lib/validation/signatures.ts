import { z } from 'zod'

export const createSignatureRequestSchema = z.object({
  documentType: z.enum(['QUOTE', 'CONTRACT', 'CUSTOM'], { message: 'Tipo documento non valido' }),
  documentId: z.string().uuid().optional(),
  documentTitle: z.string().min(1, 'Titolo documento obbligatorio').max(300),
  documentUrl: z.string().url('URL documento non valido'),
  signerName: z.string().min(1, 'Nome firmatario obbligatorio').max(200),
  signerEmail: z.string().email('Email firmatario non valida'),
  signerPhone: z.string().optional(),
  signerClientId: z.string().uuid().optional(),
  message: z.string().max(2000).optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
})

export const verifyOtpSchema = z.object({
  otp: z.string().length(6, 'Il codice OTP deve essere di 6 cifre').regex(/^\d{6}$/, 'Il codice OTP deve contenere solo cifre'),
})

export const declineSignatureSchema = z.object({
  reason: z.string().max(1000).optional(),
})
