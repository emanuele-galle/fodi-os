import { z } from 'zod'

const VALID_ROLES = ['ADMIN', 'DIR_COMMERCIALE', 'DIR_TECNICO', 'DIR_SUPPORT', 'COMMERCIALE', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT'] as const

const modulePermissionsSchema = z.record(
  z.string(),
  z.array(z.string()),
).optional().default({})

const sectionPermissionSchema = z.object({
  view: z.boolean(),
  edit: z.boolean(),
})

const sectionAccessSchema = z.record(
  z.string(),
  sectionPermissionSchema,
).optional().default({})

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Nome minimo 2 caratteri').max(100),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colore esadecimale non valido').optional().default('#6366f1'),
  baseRole: z.enum(VALID_ROLES).optional().default('DEVELOPER'),
  modulePermissions: modulePermissionsSchema,
  sectionAccess: sectionAccessSchema,
})

export const updateRoleSchema = z.object({
  name: z.string().min(2, 'Nome minimo 2 caratteri').max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colore esadecimale non valido').optional(),
  baseRole: z.enum(VALID_ROLES).optional(),
  modulePermissions: modulePermissionsSchema.optional(),
  sectionAccess: sectionAccessSchema.optional(),
  isActive: z.boolean().optional(),
})
