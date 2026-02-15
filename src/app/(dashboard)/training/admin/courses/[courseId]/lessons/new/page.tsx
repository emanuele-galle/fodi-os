'use client'

import { use } from 'react'
import { LessonEditor } from '@/components/training/admin/LessonEditor'

export default function NewLessonPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params)
  return (
    <div className="p-6">
      <LessonEditor courseId={courseId} />
    </div>
  )
}
