import { z } from 'zod'

// ── Categories ──────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug non valido'),
  description: z.string().max(1000).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  type: z.enum(['INTERNAL', 'USER']).default('USER'),
  sortOrder: z.number().int().min(0).default(0),
})

export const updateCategorySchema = createCategorySchema.partial()

// ── Courses ──────────────────────────────────────────────────

export const createCourseSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().min(1, 'Titolo obbligatorio').max(300),
  slug: z.string().min(1).max(300).regex(/^[a-z0-9-]+$/, 'Slug non valido'),
  description: z.string().max(5000).optional().nullable(),
  coverUrl: z.string().url().optional().nullable(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  protectionLevel: z.enum(['NONE', 'WATERMARK', 'WATERMARK_DETECT']).default('NONE'),
  allowedRoles: z.array(z.enum(['ADMIN', 'MANAGER', 'SALES', 'PM', 'DEVELOPER', 'CONTENT', 'SUPPORT', 'CLIENT'])).default([]),
  estimatedMins: z.number().int().min(1).optional().nullable(),
  isPublished: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
})

export const updateCourseSchema = createCourseSchema.partial()

// ── Lessons ──────────────────────────────────────────────────

export const createLessonSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(300),
  slug: z.string().min(1).max(300).regex(/^[a-z0-9-]+$/, 'Slug non valido'),
  content: z.any().optional().nullable(),
  contentText: z.string().optional().nullable(),
  contentType: z.enum(['TEXT', 'VIDEO', 'QUIZ', 'MIXED']).default('TEXT'),
  videoUrl: z.string().optional().nullable(),
  videoDurationSecs: z.number().int().min(0).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(false),
})

export const updateLessonSchema = createLessonSchema.partial()

export const reorderLessonsSchema = z.object({
  lessons: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().min(0),
  })),
})

// ── Quiz ──────────────────────────────────────────────────

export const createQuizSchema = z.object({
  question: z.string().min(1, 'Domanda obbligatoria').max(2000),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']).default('SINGLE_CHOICE'),
  options: z.array(z.object({
    label: z.string().min(1),
    value: z.string().min(1),
  })).min(2, 'Almeno 2 opzioni'),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
})

export const updateQuizSchema = createQuizSchema.partial()

export const answerQuizSchema = z.object({
  answer: z.union([z.string(), z.array(z.string())]),
})

// ── Progress ──────────────────────────────────────────────────

export const updateProgressSchema = z.object({
  timeSpentSecs: z.number().int().min(0).optional(),
  videoProgressPct: z.number().min(0).max(100).optional(),
  isCompleted: z.boolean().optional(),
})

export const heartbeatSchema = z.object({
  timeSpentSecs: z.number().int().min(0).default(30),
})

// ── Security ──────────────────────────────────────────────────

export const securityLogSchema = z.object({
  events: z.array(z.object({
    lessonId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    event: z.string().min(1).max(100),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).min(1).max(50),
})
