import { z } from 'zod'

const VALID_ROLES = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT'] as const

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'Nome obbligatorio').max(100).optional(),
  lastName: z.string().min(1, 'Cognome obbligatorio').max(100).optional(),
  username: z.string().min(3, 'Username minimo 3 caratteri').max(30, 'Username massimo 30 caratteri').regex(/^[a-zA-Z0-9._-]+$/, 'Solo lettere, numeri, punti, trattini e underscore').optional(),
  phone: z.string().max(30).optional().nullable(),
  bio: z.string().max(200).optional().nullable(),
  timezone: z.string().max(50).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
  dailyDigest: z.boolean().optional(),
  workSchedule: z.record(
    z.string(),
    z.object({ start: z.number().min(0).max(23), end: z.number().min(1).max(24) })
  ).optional(),
})

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email('Email non valida').max(255).optional(),
  role: z.enum(VALID_ROLES).optional(),
  customRoleId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
  phone: z.string().max(30).optional().nullable(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  sectionAccess: z.record(z.string(), z.boolean()).optional().nullable(),
})

export const inviteUserSchema = z.object({
  email: z.string().email('Email non valida').max(255),
  firstName: z.string().min(1, 'Nome obbligatorio').max(100),
  lastName: z.string().min(1, 'Cognome obbligatorio').max(100),
  userRole: z.enum(VALID_ROLES).optional(),
  customRoleId: z.string().uuid().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
})
