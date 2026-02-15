'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Clock, Play, CheckCircle2, FileText, HelpCircle, Layers, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { DifficultyBadge } from './DifficultyBadge'

interface Lesson {
  id: string
  title: string
  sortOrder: number
  contentType: string
  isCompleted?: boolean
}

interface CourseData {
  id: string
  title: string
  description: string | null
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  estimatedMins: number | null
  coverUrl: string | null
  _count: { lessons: number }
  lessons: Lesson[]
  enrollment: { progress: number; status: string; completedAt: string | null } | null
}

const CONTENT_TYPE_ICONS: Record<string, typeof FileText> = {
  TEXT: FileText,
  VIDEO: Play,
  QUIZ: HelpCircle,
  MIXED: Layers,
}

export function CourseDetail({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<CourseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    async function fetchCourse() {
      try {
        const res = await fetch(`/api/training/courses/${courseId}`, { credentials: 'include' })
        if (res.ok) setCourse(await res.json())
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [courseId])

  async function handleEnroll() {
    setEnrolling(true)
    try {
      const res = await fetch(`/api/training/courses/${courseId}/enroll`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setCourse((prev) => prev ? { ...prev, enrollment: data.enrollment ?? { progress: 0, status: 'ACTIVE', completedAt: null } } : prev)
      }
    } catch {
      // silently fail
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-1/2" />
        <div className="space-y-3 mt-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!course) {
    return <p className="text-muted text-center py-12">Corso non trovato.</p>
  }

  const progress = course.enrollment?.progress ?? 0

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna al catalogo
      </button>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <DifficultyBadge difficulty={course.difficulty} />
          <span className="inline-flex items-center gap-1 text-sm text-muted">
            <BookOpen className="h-3.5 w-3.5" />
            {course._count.lessons} {course._count.lessons === 1 ? 'lezione' : 'lezioni'}
          </span>
          {course.estimatedMins && (
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <Clock className="h-3.5 w-3.5" />
              {course.estimatedMins} min
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>

        {course.description && (
          <p className="text-sm text-muted leading-relaxed">{course.description}</p>
        )}
      </div>

      {/* Enrollment / Progress */}
      {!course.enrollment ? (
        <Button onClick={handleEnroll} loading={enrolling} size="lg">
          Inizia Corso
        </Button>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Il tuo progresso</span>
            <span className="text-sm font-semibold text-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {course.enrollment.completedAt && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Corso completato!
            </p>
          )}
        </div>
      )}

      {/* Lesson list */}
      <div className="space-y-2">
        <h2 className="text-[15px] font-semibold text-foreground">Lezioni</h2>
        <div className="space-y-1">
          {course.lessons
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((lesson) => {
              const Icon = CONTENT_TYPE_ICONS[lesson.contentType] || FileText
              return (
                <a
                  key={lesson.id}
                  href={`/dashboard/training/courses/${courseId}/lessons/${lesson.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                >
                  <span className="flex items-center justify-center h-7 w-7 rounded-full bg-secondary text-xs font-medium text-muted shrink-0">
                    {lesson.sortOrder}
                  </span>
                  <Icon className="h-4 w-4 text-muted shrink-0" />
                  <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {lesson.title}
                  </span>
                  {lesson.isCompleted && (
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  )}
                </a>
              )
            })}
        </div>
      </div>
    </div>
  )
}
