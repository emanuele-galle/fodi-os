'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Clock, Trophy, BarChart3 } from 'lucide-react'

interface UserDetail {
  user: { id: string; firstName: string; lastName: string; email: string }
  enrollments: Array<{
    course: { id: string; title: string }
    status: string
    progress: number
    createdAt: string
    completedAt: string | null
  }>
  totalTimeSpentSecs: number
  quizScores: Array<{ courseTitle: string; avgScore: number }>
}

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/training/analytics/users/${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(res => res && setData(res.data))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-secondary rounded-lg shimmer" />
        <div className="h-48 bg-secondary rounded-xl shimmer" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-muted">Utente non trovato</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-secondary rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{data.user.firstName} {data.user.lastName}</h1>
          <p className="text-muted text-sm">{data.user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-elevated p-4 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{data.enrollments.length}</p>
            <p className="text-sm text-muted">Corsi iscritti</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-accent" />
          <div>
            <p className="text-2xl font-bold">{data.enrollments.filter(e => e.status === 'COMPLETED').length}</p>
            <p className="text-sm text-muted">Corsi completati</p>
          </div>
        </div>
        <div className="card-elevated p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-warning" />
          <div>
            <p className="text-2xl font-bold">{formatTime(data.totalTimeSpentSecs)}</p>
            <p className="text-sm text-muted">Tempo totale</p>
          </div>
        </div>
      </div>

      <div className="card-elevated p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> Corsi
        </h2>
        <div className="space-y-3">
          {data.enrollments.map(enrollment => (
            <div key={enrollment.course.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="font-medium">{enrollment.course.title}</p>
                <p className="text-xs text-muted">
                  {enrollment.status === 'COMPLETED' ? 'Completato' : 'In corso'}
                  {enrollment.completedAt && ` il ${new Date(enrollment.completedAt).toLocaleDateString('it-IT')}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.round(enrollment.progress * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {Math.round(enrollment.progress * 100)}%
                </span>
              </div>
            </div>
          ))}
          {data.enrollments.length === 0 && (
            <p className="text-muted text-sm">Nessun corso frequentato</p>
          )}
        </div>
      </div>
    </div>
  )
}
