'use client'

import { use } from 'react'
import { LessonEditor } from '@/components/training/admin/LessonEditor'

export default function EditLessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = use(params)
  return (
    <div className="p-6">
      <LessonEditor courseId={courseId} lessonId={lessonId} />
    </div>
  )
}
