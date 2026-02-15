'use client'

import { ChevronLeft, ChevronRight, CheckCircle2, PartyPopper } from 'lucide-react'

interface LessonRef {
  id: string
  title: string
}

interface LessonNavigationProps {
  prevLesson?: LessonRef
  nextLesson?: LessonRef
  onNavigate: (lessonId: string) => void
  isCurrentCompleted: boolean
}

export function LessonNavigation({
  prevLesson,
  nextLesson,
  onNavigate,
  isCurrentCompleted,
}: LessonNavigationProps) {
  return (
    <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
      {prevLesson ? (
        <button
          onClick={() => onNavigate(prevLesson.id)}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          <div className="text-left">
            <span className="block text-xs text-zinc-500">Precedente</span>
            <span className="block max-w-[200px] truncate">{prevLesson.title}</span>
          </div>
        </button>
      ) : (
        <div />
      )}

      {nextLesson ? (
        isCurrentCompleted ? (
          <button
            onClick={() => onNavigate(nextLesson.id)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            <div className="text-right">
              <span className="block text-xs text-blue-200">Successiva</span>
              <span className="block max-w-[200px] truncate">{nextLesson.title}</span>
            </div>
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => onNavigate(nextLesson.id)}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-500"
          >
            <CheckCircle2 className="h-4 w-4" />
            Completa e Continua
            <ChevronRight className="h-4 w-4" />
          </button>
        )
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-yellow-600 to-amber-600 px-5 py-2.5 text-sm font-medium text-white">
          <PartyPopper className="h-4 w-4" />
          Corso Completato!
        </div>
      )}
    </div>
  )
}
