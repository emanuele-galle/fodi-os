import { z } from 'zod'

const VALID_ROLES = ['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT'] as const

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'Nome obbligatorio').max(100).optional(),
  lastName: z.string().min(1, 'Cognome obbligatorio').max(100).optional(),
  phone: z.string().max(30).optional().nullable(),
})

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email('Email non valida').max(255).optional(),
  role: z.enum(VALID_ROLES).optional(),
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
  phone: z.string().max(30).optional().nullable(),
})
