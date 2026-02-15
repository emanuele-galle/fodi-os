'use client'

import { use } from 'react'
import { CourseEditor } from '@/components/training/admin/CourseEditor'

export default function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params)
  return (
    <div className="p-6">
      <CourseEditor courseId={courseId} />
    </div>
  )
}
