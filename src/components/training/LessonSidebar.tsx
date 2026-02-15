'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, FileText, Play, HelpCircle, Layers } from 'lucide-react'

interface Lesson {
  id: string
  title: string
  sortOrder: number
  contentType: string
  isCompleted?: boolean
}

interface LessonSidebarProps {
  courseId: string
  lessons: Lesson[]
  currentLessonId: string
  onSelectLesson: (id: string) => void
}

const CONTENT_TYPE_ICONS: Record<string, typeof FileText> = {
  TEXT: FileText,
  VIDEO: Play,
  QUIZ: HelpCircle,
  MIXED: Layers,
}

export function LessonSidebar({ lessons, currentLessonId, onSelectLesson }: LessonSidebarProps) {
  return (
    <nav className="sticky top-4 space-y-1">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider px-3 mb-2">
        Lezioni
      </h3>
      {lessons
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((lesson) => {
          const Icon = CONTENT_TYPE_ICONS[lesson.contentType] || FileText
          const isCurrent = lesson.id === currentLessonId

          return (
            <button
              key={lesson.id}
              onClick={() => onSelectLesson(lesson.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors text-sm',
                isCurrent
                  ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                  : 'text-foreground hover:bg-secondary/50'
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-medium shrink-0',
                  isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : lesson.isCompleted
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-secondary text-muted'
                )}
              >
                {lesson.sortOrder}
              </span>
              <Icon className={cn('h-3.5 w-3.5 shrink-0', isCurrent ? 'text-primary' : 'text-muted')} />
              <span className="flex-1 truncate">{lesson.title}</span>
              {lesson.isCompleted && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              )}
            </button>
          )
        })}
    </nav>
  )
}
