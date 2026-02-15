'use client'

import { useState, useCallback } from 'react'
import { LessonTextContent } from './LessonTextContent'
import { TrainingVideoPlayer } from './TrainingVideoPlayer'
import { QuizPlayer } from './QuizPlayer'
import { ContentProtection } from './ContentProtection'

interface QuizOption {
  id: string
  text: string
}

interface QuizData {
  id: string
  question: string
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE'
  options: QuizOption[]
}

interface Attachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize?: number
  fileSizeBytes?: number
  mimeType?: string
}

interface Lesson {
  id: string
  title: string
  content: unknown
  contentText?: string | null
  contentType: string
  videoUrl?: string | null
  videoDurationSecs?: number | null
  quizzes: Array<{ id: string; question: string; type: string; options: unknown }>
  attachments: Attachment[]
}

interface LessonViewerProps {
  lesson: Lesson
  courseProtectionLevel: string
  onComplete: () => void
  userEmail?: string
  userName?: string
}

export function LessonViewer({
  lesson,
  courseProtectionLevel,
  onComplete,
  userEmail = '',
  userName = '',
}: LessonViewerProps) {
  const [videoProgress, setVideoProgress] = useState(0)

  const handleVideoComplete = useCallback(() => {
    if (lesson.contentType === 'VIDEO') {
      onComplete()
    }
  }, [lesson.contentType, onComplete])

  const handleQuizAllCorrect = useCallback(() => {
    if (lesson.contentType === 'QUIZ') {
      onComplete()
    }
  }, [lesson.contentType, onComplete])

  const renderContent = () => {
    switch (lesson.contentType) {
      case 'TEXT':
        return lesson.content ? (
          <LessonTextContent content={lesson.content as any} />
        ) : null

      case 'VIDEO':
        return lesson.videoUrl ? (
          <TrainingVideoPlayer
            videoUrl={lesson.videoUrl}
            lessonId={lesson.id}
            onProgress={setVideoProgress}
            onComplete={handleVideoComplete}
            watermarkText={
              courseProtectionLevel !== 'NONE' ? userName : undefined
            }
          />
        ) : null

      case 'QUIZ':
        return lesson.quizzes.length > 0 ? (
          <QuizPlayer
            quizzes={lesson.quizzes as any}
            lessonId={lesson.id}
            onAllCorrect={handleQuizAllCorrect}
          />
        ) : null

      case 'MIXED':
        return (
          <div className="space-y-8">
            {lesson.content != null && (
              <LessonTextContent content={lesson.content as any} />
            )}
            {lesson.videoUrl && (
              <TrainingVideoPlayer
                videoUrl={lesson.videoUrl}
                lessonId={lesson.id}
                onProgress={setVideoProgress}
                onComplete={handleVideoComplete}
                watermarkText={
                  courseProtectionLevel !== 'NONE' ? userName : undefined
                }
              />
            )}
            {lesson.quizzes.length > 0 && (
              <QuizPlayer
                quizzes={lesson.quizzes as any}
                lessonId={lesson.id}
                onAllCorrect={handleQuizAllCorrect}
              />
            )}
          </div>
        )

      default:
        return null
    }
  }

  const content = (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{lesson.title}</h1>
      {renderContent()}

      {/* Attachments */}
      {lesson.attachments.length > 0 && (
        <div className="border-t border-zinc-800 pt-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-400">Allegati</h3>
          <div className="space-y-2">
            {lesson.attachments.map((att) => (
              <a
                key={att.id}
                href={att.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              >
                <span className="truncate">{att.fileName}</span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {formatFileSize(att.fileSizeBytes ?? att.fileSize ?? 0)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (courseProtectionLevel === 'NONE') {
    return content
  }

  return (
    <ContentProtection
      protectionLevel={courseProtectionLevel as 'WATERMARK' | 'WATERMARK_DETECT'}
      userEmail={userEmail}
      userName={userName}
    >
      {content}
    </ContentProtection>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
