'use client'

import { use } from 'react'
import { CourseDetail } from '@/components/training/CourseDetail'

export default function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params)
  return <CourseDetail courseId={courseId} />
}
