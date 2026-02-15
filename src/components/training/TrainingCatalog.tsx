'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoryFilter } from './CategoryFilter'
import { CourseCard } from './CourseCard'

type CourseType = 'INTERNAL' | 'USER'
type Difficulty = '' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

interface Category {
  id: string
  name: string
  icon: string | null
  type: string
  _count: { courses: number }
}

interface Course {
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

const TABS: { id: CourseType; label: string }[] = [
  { id: 'INTERNAL', label: 'Formazione Interna' },
  { id: 'USER', label: 'Formazione Utente' },
]

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: '', label: 'Tutte le difficolta' },
  { value: 'BEGINNER', label: 'Principiante' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzato' },
]

export function TrainingCatalog() {
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<CourseType>('INTERNAL')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('')

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: activeTab, isPublished: 'true' })
      if (selectedCategoryId) params.set('categoryId', selectedCategoryId)
      if (search) params.set('search', search)
      if (difficulty) params.set('difficulty', difficulty)

      const res = await fetch(`/api/training/courses?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCourses(data.data ?? data.courses ?? data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedCategoryId, search, difficulty])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/training/categories?type=${activeTab}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setCategories(data.data ?? data.categories ?? data)
      }
    } catch {
      // silently fail
    }
  }, [activeTab])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  useEffect(() => {
    fetchCategories()
    setSelectedCategoryId(null)
  }, [fetchCategories])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(fetchCourses, 300)
    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex bg-secondary/60 rounded-lg p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 md:py-1.5 text-sm font-medium transition-all rounded-lg whitespace-nowrap flex-1 min-h-[44px] md:min-h-0',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-[var(--shadow-sm)]'
                : 'text-muted hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + difficulty filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Cerca corsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-11 md:h-10 w-full rounded-lg border border-border/50 bg-card/50 pl-9 pr-3 py-2 text-base md:text-sm transition-all placeholder:text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40"
          />
        </div>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          className="h-11 md:h-10 rounded-lg border border-border/50 bg-card/50 px-3 text-base md:text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/40 sm:w-48"
        >
          {DIFFICULTY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
      )}

      {/* Course grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/40 bg-card overflow-hidden">
              <Skeleton className="h-36 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nessun corso trovato"
          description="Prova a cambiare i filtri di ricerca o la categoria selezionata."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => {
                window.location.href = `/dashboard/training/courses/${course.id}`
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
