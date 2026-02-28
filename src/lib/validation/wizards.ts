import { z } from 'zod'

const conditionSchema = z.object({
  fieldId: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains', 'notContains', 'empty', 'notEmpty']),
  value: z.union([z.string(), z.number(), z.boolean()]),
}).optional().nullable()

const fieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
})

const fieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
}).optional().nullable()

const FIELD_TYPES = [
  'TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'NUMBER',
  'SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX',
  'DATE', 'FILE', 'RATING', 'SCALE',
] as const

const CRM_MAPPINGS = [
  'client.companyName', 'client.vatNumber', 'client.fiscalCode',
  'client.pec', 'client.sdi', 'client.website', 'client.industry',
  'client.source', 'client.notes',
  'contact.firstName', 'contact.lastName', 'contact.email',
  'contact.phone', 'contact.role', 'contact.notes',
] as const

export const createWizardTemplateSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(200),
  description: z.string().optional(),
  category: z.string().default('general'),
  allowSaveProgress: z.boolean().default(true),
  showProgressBar: z.boolean().default(true),
  completionMessage: z.string().optional(),
})

export const updateWizardTemplateSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(200).optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional(),
  allowSaveProgress: z.boolean().optional(),
  showProgressBar: z.boolean().optional(),
  completionMessage: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
})

export const createWizardStepSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(200),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
  condition: conditionSchema,
})

export const updateWizardStepSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(200).optional(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  condition: conditionSchema,
})

export const createWizardFieldSchema = z.object({
  label: z.string().min(1, 'Etichetta obbligatoria').max(200),
  name: z.string().min(1, 'Nome campo obbligatorio').max(100),
  type: z.enum(FIELD_TYPES).default('TEXT'),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  options: z.array(fieldOptionSchema).optional().nullable(),
  validation: fieldValidationSchema,
  defaultValue: z.string().optional(),
  condition: conditionSchema,
  crmMapping: z.string().optional().nullable(),
})

export const updateWizardFieldSchema = z.object({
  label: z.string().min(1, 'Etichetta obbligatoria').max(200).optional(),
  name: z.string().min(1, 'Nome campo obbligatorio').max(100).optional(),
  type: z.enum(FIELD_TYPES).optional(),
  placeholder: z.string().optional().nullable(),
  helpText: z.string().optional().nullable(),
  isRequired: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  options: z.array(fieldOptionSchema).optional().nullable(),
  validation: fieldValidationSchema,
  defaultValue: z.string().optional().nullable(),
  condition: conditionSchema,
  crmMapping: z.string().optional().nullable(),
})

export const createSubmissionSchema = z.object({
  templateId: z.string().uuid('ID template non valido'),
  clientId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  submitterName: z.string().optional(),
  submitterEmail: z.string().email('Email non valida').optional().or(z.literal('')),
})

export const updateSubmissionSchema = z.object({
  currentStep: z.number().int().min(0).optional(),
  answers: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED']).optional(),
})
