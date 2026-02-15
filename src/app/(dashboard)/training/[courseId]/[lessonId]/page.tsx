'use client'

import { use, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { LessonViewer } from '@/components/training/LessonViewer'
import { LessonSidebar } from '@/components/training/LessonSidebar'
import { LessonNavigation } from '@/components/training/LessonNavigation'
import { ContentProtection } from '@/components/training/ContentProtection'

interface Lesson {
  id: string
  title: string
  slug: string
  content: unknown
  contentText: string | null
  contentType: string
  videoUrl: string | null
  videoDurationSecs: number | null
  sortOrder: number
  quizzes: Array<{ id: string; question: string; type: string; options: unknown }>
  attachments: Array<{ id: string; fileName: string; fileUrl: string; fileSize: number; mimeType: string }>
  progress?: { isCompleted: boolean; videoProgressPct: number; timeSpentSecs: number } | null
}

interface Course {
  id: string
  title: string
  protectionLevel: string
  lessons: Array<{ id: string; title: string; sortOrder: number; contentType: string }>
}

export default function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = use(params)
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [lessonRes, courseRes, sessionRes] = await Promise.all([
          fetch(`/api/training/lessons/${lessonId}`),
          fetch(`/api/training/courses/${courseId}`),
          fetch('/api/auth/session'),
        ])
        if (lessonRes.ok) {
          const data = await lessonRes.json()
          setLesson(data.data)
        }
        if (courseRes.ok) {
          const data = await courseRes.json()
          setCourse(data.data)
        }
        if (sessionRes.ok) {
          const session = await sessionRes.json()
          setUserName(`${session.firstName} ${session.lastName}`)
          setUserEmail(session.email)
        }
      } catch (e) {
        console.error('Failed to load lesson', e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [courseId, lessonId])

  const handleComplete = useCallback(async () => {
    await fetch(`/api/training/lessons/${lessonId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCompleted: true }),
    })
    setLesson(prev => prev ? { ...prev, progress: { ...prev.progress!, isCompleted: true, videoProgressPct: prev.progress?.videoProgressPct ?? 0, timeSpentSecs: prev.progress?.timeSpentSecs ?? 0 } } : null)
  }, [lessonId])

  const handleNavigate = useCallback((id: string) => {
    router.push(`/training/${courseId}/${id}`)
  }, [courseId, router])

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="w-72 bg-card border-r border-border p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-secondary rounded-lg shimmer" />
          ))}
        </div>
        <div className="flex-1 p-8">
          <div className="h-8 w-64 bg-secondary rounded-lg shimmer mb-6" />
          <div className="h-96 bg-secondary rounded-xl shimmer" />
        </div>
      </div>
    )
  }

  if (!lesson || !course) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted">Lezione non trovata</p>
      </div>
    )
  }

  const sortedLessons = course.lessons.sort((a, b) => a.sortOrder - b.sortOrder)
  const currentIndex = sortedLessons.findIndex(l => l.id === lessonId)
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : undefined
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : undefined
  const lessonListWithStatus = sortedLessons.map(l => ({
    ...l,
    isCompleted: l.id === lessonId ? (lesson.progress?.isCompleted ?? false) : false,
  }))

  const protectionLevel = course.protectionLevel as 'NONE' | 'WATERMARK' | 'WATERMARK_DETECT'

  return (
    <div className="flex h-full">
      <div className="hidden lg:block w-72 flex-shrink-0 border-r border-border overflow-y-auto">
        <div className="p-4 border-b border-border">
          <button
            onClick={() => router.push(`/training/${courseId}`)}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna al corso
          </button>
          <h3 className="font-semibold mt-2 text-sm">{course.title}</h3>
        </div>
        <LessonSidebar
          courseId={courseId}
          lessons={lessonListWithStatus}
          currentLessonId={lessonId}
          onSelectLesson={handleNavigate}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <ContentProtection
          protectionLevel={protectionLevel}
          userName={userName}
          userEmail={userEmail}
        >
          <div className="max-w-4xl mx-auto p-6 lg:p-8">
            <h1 className="text-2xl font-bold mb-6">{lesson.title}</h1>
            <LessonViewer
              lesson={lesson}
              courseProtectionLevel={course.protectionLevel}
              onComplete={handleComplete}
            />
            <div className="mt-8">
              <LessonNavigation
                prevLesson={prevLesson}
                nextLesson={nextLesson}
                onNavigate={handleNavigate}
                isCurrentCompleted={lesson.progress?.isCompleted ?? false}
              />
            </div>
          </div>
        </ContentProtection>
      </div>
    </div>
  )
}
