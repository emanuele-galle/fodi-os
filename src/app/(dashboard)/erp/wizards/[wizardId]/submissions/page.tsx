'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ArrowLeft, ClipboardList, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { WizardRunner } from '@/components/erp/WizardRunner'

interface SubmissionTemplate {
  id: string
  name: string
  showProgressBar: boolean
  allowSaveProgress: boolean
  completionMessage: string | null
  steps: unknown[]
}

interface Submission {
  id: string
  submitterName: string | null
  submitterEmail: string | null
  status: string
  currentStep: number
  answers: Record<string, unknown>
  completedAt: string | null
  createdAt: string
  template: SubmissionTemplate
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  ABANDONED: 'destructive',
}
const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'In corso',
  COMPLETED: 'Completata',
  ABANDONED: 'Abbandonata',
}

export default function WizardSubmissionsPage({ params }: { params: Promise<{ wizardId: string }> }) {
  const { wizardId } = use(params)
  const router = useRouter()
  const [wizardName, setWizardName] = useState('')
  const [loading, setLoading] = useState(true)
  const [viewSubmission, setViewSubmission] = useState<Submission | null>(null)
  const [creating, setCreating] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/wizards/${wizardId}`)
      if (res.ok) {
        const wiz = await res.json()
        setWizardName(wiz.name)
      }
    } finally {
      setLoading(false)
    }
  }, [wizardId])

  useEffect(() => { fetchData() }, [fetchData])

  const createSubmission = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/wizard-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: wizardId }),
      })
      if (res.ok) {
        const sub = await res.json()
        const fullRes = await fetch(`/api/wizard-submissions/${sub.id}`)
        if (fullRes.ok) {
          const full = await fullRes.json()
          setViewSubmission(full)
        }
      }
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-fade-in">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-96" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/erp/wizards/${wizardId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate">Compilazioni</h1>
            <p className="text-xs text-muted truncate">{wizardName}</p>
          </div>
        </div>
        <Button size="sm" onClick={createSubmission} loading={creating}>
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Nuova compilazione</span>
        </Button>
      </div>

      <EmptyState
        icon={ClipboardList}
        title="Gestione compilazioni"
        description="Crea una nuova compilazione per iniziare a raccogliere dati con questo wizard."
        action={
          <Button onClick={createSubmission} loading={creating}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova compilazione
          </Button>
        }
      />

      {viewSubmission && (
        <Modal
          open={!!viewSubmission}
          onClose={() => setViewSubmission(null)}
          title="Compilazione wizard"
          size="lg"
        >
          <WizardRunner
            template={viewSubmission.template as Parameters<typeof WizardRunner>[0]['template']}
            submissionId={viewSubmission.id}
            initialAnswers={viewSubmission.answers}
            initialStep={viewSubmission.currentStep}
            onComplete={() => {
              setViewSubmission(null)
              fetchData()
            }}
          />
        </Modal>
      )}
    </div>
  )
}
