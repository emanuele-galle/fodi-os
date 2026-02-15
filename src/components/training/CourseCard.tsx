'use client'

import { BookOpen, Clock } from 'lucide-react'
import { DifficultyBadge } from './DifficultyBadge'

interface CourseCardProps {
  course: {
    id: string
    title: string
    slug: string
    description: string | null
    coverUrl: string | null
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
    estimatedMins: number | null
    category: { id: string; name: string; icon: string | null } | null
    _count: { lessons: number }
    enrollment?: { progress: number; status: string } | null
  }
  onClick?: () => void
}

const GRADIENT_PLACEHOLDERS = [
  'from-violet-500/20 to-indigo-500/20',
  'from-emerald-500/20 to-teal-500/20',
  'from-amber-500/20 to-orange-500/20',
  'from-rose-500/20 to-pink-500/20',
  'from-cyan-500/20 to-blue-500/20',
]

function getGradient(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return GRADIENT_PLACEHOLDERS[Math.abs(hash) % GRADIENT_PLACEHOLDERS.length]
}

function getProgressColor(progress: number) {
  if (progress >= 80) return 'bg-emerald-500'
  if (progress >= 40) return 'bg-amber-500'
  return 'bg-blue-500'
}

export function CourseCard({ course, onClick }: CourseCardProps) {
  const progress = course.enrollment?.progress ?? null

  return (
    <div
      onClick={onClick}
      className="group rounded-xl border border-border/40 bg-card overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-border/60 hover:-translate-y-0.5"
    >
      {/* Cover */}
      <div className="relative h-36 overflow-hidden">
        {course.coverUrl ? (
          <img
            src={course.coverUrl}
            alt={course.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getGradient(course.id)} flex items-center justify-center`}>
            <BookOpen className="h-10 w-10 text-muted/40" />
          </div>
        )}
        {course.category && (
          <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-card/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full border border-border/30">
            {course.category.icon && <span>{course.category.icon}</span>}
            {course.category.name}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <DifficultyBadge difficulty={course.difficulty} />
        </div>

        <h3 className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {course.title}
        </h3>

        {course.description && (
          <p className="text-xs text-muted line-clamp-2">{course.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-border/30">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {course._count.lessons} {course._count.lessons === 1 ? 'lezione' : 'lezioni'}
          </span>
          {course.estimatedMins && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {course.estimatedMins} min
            </span>
          )}
        </div>

        {/* Progress bar */}
        {progress !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Progresso</span>
              <span className="font-medium text-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${getProgressColor(progress)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
